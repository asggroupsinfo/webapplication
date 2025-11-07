from celery import Celery
import requests
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

# Celery app
celery_app = Celery(
    'forex_master_pro',
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)


@celery_app.task(name='send_webhook_alert')
def send_webhook_alert(webhook_url: str, alert_data: dict, max_retries: int = 3):
    """Send alert to webhook URL with retry logic"""
    for attempt in range(max_retries):
        try:
            response = requests.post(
                webhook_url,
                json=alert_data,
                timeout=10
            )
            response.raise_for_status()
            logger.info(f"Webhook alert sent successfully to {webhook_url}")
            return {"status": "success", "attempt": attempt + 1}
        except requests.exceptions.RequestException as e:
            logger.warning(f"Webhook alert failed (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                import time
                time.sleep(2 ** attempt)  # Exponential backoff
            else:
                logger.error(f"Webhook alert failed after {max_retries} attempts")
                return {"status": "failed", "error": str(e)}
    
    return {"status": "failed", "error": "Max retries exceeded"}

