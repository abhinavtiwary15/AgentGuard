#!/usr/bin/env bash
# ==============================================================================
# AgentGuard Swarm SOC - Azure Deployment Script
# ==============================================================================
set -euo pipefail

# Configuration
RG_NAME="rg-agentguard-prod"
LOCATION="eastus"
TEMPLATE_FILE="main.bicep"
PARAMS_FILE="parameters.json"

echo "🛡️ AgentGuard Swarm SOC — Azure Deployer"
echo "========================================"

# 1. Check Azure CLI installation
if ! command -v az &> /dev/null; then
    echo "❌ Error: Azure CLI (az) is not installed. Please install it first."
    exit 1
fi

# 2. Check Azure login status
echo "🔍 Checking Azure account status..."
if ! az account show &> /dev/null; then
    echo "🔑 You are not logged in. Initiating Azure login..."
    az login
fi

# 3. Create Resource Group
echo "📦 Creating resource group: ${RG_NAME} in ${LOCATION}..."
az group create --name "${RG_NAME}" --location "${LOCATION}" --output table

# 4. Deploy Bicep template
echo "🚀 Deploying Bicep template to Azure (this can take a few minutes)..."
deployment_output=$(az deployment group create \
    --resource-group "${RG_NAME}" \
    --template-file "${TEMPLATE_FILE}" \
    --parameters "${PARAMS_FILE}" \
    --query "properties.outputs" \
    --output json)

echo "✅ Deployment completed successfully!"
echo "========================================"
echo "📝 Deployment Outputs:"
echo "${deployment_output}" | jq . || echo "${deployment_output}"

echo "========================================"
echo "💡 Next Steps:"
echo "1. Copy the endpoints from the outputs above."
echo "2. Create a .env file in the backend folder using these keys."
echo "3. Run 'docker compose -f docker-compose.prod.yml up --build' to launch production."
echo "========================================"
