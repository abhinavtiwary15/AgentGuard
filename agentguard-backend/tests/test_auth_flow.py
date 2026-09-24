import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx
from main import app
from core.config import settings

async def main():
    print("--- 1. Testing Default Bootstrap & Seed ---")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Bootstrap
        r = await client.post("/api/auth/bootstrap")
        print("Bootstrap response:", r.status_code, r.json())
        assert r.status_code in (200, 201)

        # Login with default seeded admin credentials
        print("\n--- 2. Testing Login with Seeded Admin ---")
        login_resp = await client.post("/api/auth/login", json={
            "username": "admin",
            "password": "AdminGuard2026!"
        })
        print("Login status:", login_resp.status_code)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        data = login_resp.json()
        token = data["access_token"]
        assert token, "No access_token returned"
        print("Successfully obtained signed JWT:", token[:25] + "...")

        # Access protected endpoint with real JWT
        print("\n--- 3. Testing Protected Endpoint (/api/auth/me) with Real JWT ---")
        me_resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        print("Me profile status:", me_resp.status_code, me_resp.json())
        assert me_resp.status_code == 200
        assert me_resp.json()["username"] == "admin"

        # Access protected business endpoint (/api/incidents/) with real JWT
        print("\n--- 4. Testing Incidents API with Real JWT ---")
        inc_resp = await client.get("/api/incidents/", headers={"Authorization": f"Bearer {token}"})
        print("Incidents status:", inc_resp.status_code)
        assert inc_resp.status_code == 200

        # Programmatic API Key generation
        print("\n--- 5. Testing API Key Generation Endpoint ---")
        key_resp = await client.post("/api/auth/generate-key", headers={"Authorization": f"Bearer {token}"})
        print("Generate API Key status:", key_resp.status_code, key_resp.json())
        assert key_resp.status_code == 200
        assert "api_key" in key_resp.json()

        # Test user registration
        print("\n--- 6. Testing New Analyst Registration ---")
        reg_resp = await client.post("/api/auth/register", json={
            "username": "sec_analyst_1",
            "email": "analyst1@agentguard.ai",
            "password": "AnalystPassword2026!",
            "role": "analyst"
        })
        print("Registration status:", reg_resp.status_code, reg_resp.json())
        assert reg_resp.status_code == 201

        # Login with newly registered user
        analyst_login = await client.post("/api/auth/login", json={
            "username": "sec_analyst_1",
            "password": "AnalystPassword2026!"
        })
        print("Analyst login status:", analyst_login.status_code)
        assert analyst_login.status_code == 200
        analyst_token = analyst_login.json()["access_token"]

        # Reject no token
        print("\n--- 7. Testing 401 Rejection with No Token ---")
        no_token_resp = await client.get("/api/incidents/")
        print("No token status:", no_token_resp.status_code)
        assert no_token_resp.status_code == 401

        # Reject malformed/invalid token
        print("\n--- 8. Testing 401 Rejection with Malformed Token ---")
        bad_token_resp = await client.get("/api/incidents/", headers={"Authorization": "Bearer not-a-valid-token"})
        print("Bad token status:", bad_token_resp.status_code)
        assert bad_token_resp.status_code == 401

        # Verify is_default_password flag
        assert me_resp.json().get("is_default_password") is True

        # Test dummy token behavior in production vs development
        print("\n--- 9. Testing Dummy Token Guard in Production Mode ---")
        settings.ENVIRONMENT = "production"
        prod_dummy_resp = await client.get("/api/incidents/", headers={"Authorization": "Bearer dummy-token-for-hackathon"})
        print("Dummy token in production status:", prod_dummy_resp.status_code)
        assert prod_dummy_resp.status_code == 401, "Dummy token MUST be rejected in production"
        settings.ENVIRONMENT = "development"

        # Test changing password
        print("\n--- 10. Testing Change Password Endpoint ---")
        change_resp = await client.post("/api/auth/change-password", headers={"Authorization": f"Bearer {token}"}, json={
            "current_password": "AdminGuard2026!",
            "new_password": "NewAdminPassword2026!"
        })
        print("Change password status:", change_resp.status_code, change_resp.json())
        assert change_resp.status_code == 200

        # Login with new password
        new_login = await client.post("/api/auth/login", json={
            "username": "admin",
            "password": "NewAdminPassword2026!"
        })
        assert new_login.status_code == 200
        new_token = new_login.json()["access_token"]
        new_me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {new_token}"})
        assert new_me.json().get("is_default_password") is False
        print("Verified password updated: is_default_password is now False")

        # Test honest metrics in dashboard and stats
        print("\n--- 11. Testing Honest Metrics Computation ---")
        dash_resp = await client.get("/api/reports/dashboard", headers={"Authorization": f"Bearer {new_token}"})
        print("Dashboard metrics status:", dash_resp.status_code)
        assert dash_resp.status_code == 200
        dash_data = dash_resp.json()
        assert len(dash_data["hourly_trend"]) == 12
        assert "server_uptime_seconds" in dash_data
        assert dash_data["server_uptime_seconds"] >= 0
        assert dash_data["uptime_pct"] is None, "uptime_pct must not be a fake 99.9%"
        print("Dashboard metrics verified honest:", {
            "hourly_trend": dash_data["hourly_trend"],
            "auto_resolved_pct": dash_data["auto_resolved_pct"],
            "server_uptime_seconds": round(dash_data["server_uptime_seconds"], 2)
        })

        stats_resp = await client.get("/api/incidents/stats", headers={"Authorization": f"Bearer {new_token}"})
        assert stats_resp.status_code == 200
        stats_data = stats_resp.json()
        assert "uptime_seconds" in stats_data
        print("Stats verified honest:", {
            "total": stats_data["total"],
            "uptime_seconds": round(stats_data["uptime_seconds"], 2),
            "auto_resolved_pct": stats_data["auto_resolved_pct"]
        })

    print("\n✅ ALL AUTHENTICATION AND METRIC COMPUTATION CHECKS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(main())
