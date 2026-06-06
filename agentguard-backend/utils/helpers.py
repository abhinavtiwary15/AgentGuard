import re
import html
from typing import Optional

def sanitize_log_payload(payload: str) -> str:
    """Sanitizes raw HTML/SQL/Javascript code inside log entries to prevent rendering exploits."""
    if not payload:
        return ""
    # Strip HTML tags
    cleaned = re.sub(r'<[^>]*?>', '', payload)
    # Escape HTML entities
    return html.escape(cleaned)

def is_valid_ip(ip: Optional[str]) -> bool:
    """Checks if the given string represents a valid IPv4 or IPv6 address."""
    if not ip:
        return False
    ipv4_pattern = r'^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
    ipv6_pattern = r'^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$'
    return bool(re.match(ipv4_pattern, ip) or re.match(ipv6_pattern, ip))

def extract_cves(text: str) -> list[str]:
    """Helper to extract CVE IDs (e.g. CVE-2024-1234) from unstructured text."""
    if not text:
        return []
    return re.findall(r'CVE-\d{4}-\d{4,7}', text, re.IGNORECASE)
