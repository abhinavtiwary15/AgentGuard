@description('The location for all resources.')
param location string = resourceGroup().location

@description('The base name for all resources.')
param baseName string = 'agentguard'

@description('The environment stage.')
@allowed([
  'dev'
  'prod'
])
param environment string = 'prod'

var uniqueSuffix = uniqueString(resourceGroup().id)
var prefix = '${baseName}-${environment}'
var openAiName = '${prefix}-openai-${uniqueSuffix}'
var searchName = '${prefix}-search-${uniqueSuffix}'
var cosmosName = '${prefix}-cosmos-${uniqueSuffix}'
var serviceBusName = '${prefix}-sb-${uniqueSuffix}'
var eventHubsNamespaceName = '${prefix}-eh-${uniqueSuffix}'
var appServicePlanName = '${prefix}-asp-${uniqueSuffix}'
var backendAppName = '${prefix}-api-${uniqueSuffix}'
var frontendAppName = '${prefix}-web-${uniqueSuffix}'

// 1. Azure OpenAI Service
resource openAi 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: openAiName
  location: location
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    publicNetworkAccess: 'Enabled'
    customSubDomainName: openAiName
  }
}

resource gpt4oDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  parent: openAi
  name: 'gpt-4o'
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o'
      version: '2024-05-13'
    }
  }
  sku: {
    name: 'Standard'
    capacity: 10
  }
}

resource gpt4oMiniDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  parent: openAi
  name: 'gpt-4o-mini'
  dependsOn: [
    gpt4oDeployment
  ]
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o-mini'
      version: '2024-07-18'
    }
  }
  sku: {
    name: 'Standard'
    capacity: 20
  }
}

resource embeddingDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  parent: openAi
  name: 'text-embedding-3-large'
  dependsOn: [
    gpt4oMiniDeployment
  ]
  properties: {
    model: {
      format: 'OpenAI'
      name: 'text-embedding-3-large'
      version: '1'
    }
  }
  sku: {
    name: 'Standard'
    capacity: 20
  }
}

// 2. Azure AI Search Service
resource searchService 'Microsoft.Search/searchServices@2023-11-01' = {
  name: searchName
  location: location
  sku: {
    name: 'standard'
  }
  properties: {
    replicaCount: 1
    partitionCount: 1
    hostingMode: 'default'
  }
}

// 3. Azure Cosmos DB Account & Containers
resource cosmosDbAccount 'Microsoft.DocumentDB/databaseAccounts@2023-11-15' = {
  name: cosmosName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
  }
}

resource cosmosDb 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-11-15' = {
  parent: cosmosDbAccount
  name: 'agentguard'
  properties: {
    resource: {
      id: 'agentguard'
    }
  }
}

resource incidentsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' = {
  parent: cosmosDb
  name: 'incidents'
  properties: {
    resource: {
      id: 'incidents'
      partitionKey: {
        paths: [
          '/id'
        ]
        kind: 'Hash'
      }
    }
  }
}

resource auditContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' = {
  parent: cosmosDb
  name: 'audit_log'
  properties: {
    resource: {
      id: 'audit_log'
      partitionKey: {
        paths: [
          '/id'
        ]
        kind: 'Hash'
      }
    }
  }
}

resource reportsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' = {
  parent: cosmosDb
  name: 'reports'
  properties: {
    resource: {
      id: 'reports'
      partitionKey: {
        paths: [
          '/id'
        ]
        kind: 'Hash'
      }
    }
  }
}

// 4. Azure Service Bus Namespace & Queues
resource serviceBusNamespace 'Microsoft.ServiceBus/namespaces@2021-11-01' = {
  name: serviceBusName
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
}

resource threatQueue 'Microsoft.ServiceBus/namespaces/queues@2021-11-01' = {
  parent: serviceBusNamespace
  name: 'threat-signals'
  properties: {
    maxSizeInMegabytes: 1024
    defaultMessageTimeToLive: 'P14D'
  }
}

resource responseQueue 'Microsoft.ServiceBus/namespaces/queues@2021-11-01' = {
  parent: serviceBusNamespace
  name: 'agent-responses'
  properties: {
    maxSizeInMegabytes: 1024
    defaultMessageTimeToLive: 'P14D'
  }
}

// 5. Azure Event Hubs Namespace & Hub
resource eventHubsNamespace 'Microsoft.EventHub/namespaces@2021-11-01' = {
  name: eventHubsNamespaceName
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
    capacity: 1
  }
}

resource securityEventHub 'Microsoft.EventHub/namespaces/eventhubs@2021-11-01' = {
  parent: eventHubsNamespace
  name: 'security-logs'
  properties: {
    messageRetentionInDays: 7
    partitionCount: 2
  }
}

// 6. App Service Plan & Web Apps
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource backendApp 'Microsoft.Web/sites@2022-09-01' = {
  name: backendAppName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'PYTHON|3.11'
      appSettings: [
        {
          name: 'APP_NAME'
          value: 'AgentGuard'
        }
        {
          name: 'ENVIRONMENT'
          value: 'production'
        }
        {
          name: 'AZURE_OPENAI_ENDPOINT'
          value: openAi.properties.endpoint
        }
        {
          name: 'AZURE_SEARCH_ENDPOINT'
          value: 'https://${searchName}.search.windows.net'
        }
        {
          name: 'COSMOS_DB_NAME'
          value: 'agentguard'
        }
        {
          name: 'EVENT_HUB_NAME'
          value: 'security-logs'
        }
        {
          name: 'SERVICE_BUS_QUEUE_THREATS'
          value: 'threat-signals'
        }
        {
          name: 'SERVICE_BUS_QUEUE_RESPONSES'
          value: 'agent-responses'
        }
      ]
    }
  }
}

resource frontendApp 'Microsoft.Web/sites@2022-09-01' = {
  name: frontendAppName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|18-lts'
    }
  }
}

output openAiEndpoint string = openAi.properties.endpoint
output searchEndpoint string = 'https://${searchName}.search.windows.net'
output cosmosDbEndpoint string = cosmosDbAccount.properties.documentEndpoint
output backendUrl string = 'https://${backendAppName}.azurewebsites.net'
output frontendUrl string = 'https://${frontendAppName}.azurewebsites.net'
