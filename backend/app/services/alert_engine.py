import asyncio
import logging
from typing import List
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import SessionLocal
from app.models.alert import Alert
from app.services.mt5_bridge import MT5Bridge
from app.tasks.alert_tasks import send_webhook_alert

logger = logging.getLogger(__name__)


class AlertEngine:
    """Alert monitoring and triggering engine"""
    
    def __init__(self):
        self.is_running = False
        self.monitoring_task = None
    
    async def start(self):
        """Start alert monitoring"""
        if self.is_running:
            return
        
        self.is_running = True
        self.monitoring_task = asyncio.create_task(self._monitor_alerts())
        logger.info("Alert engine started")
    
    async def stop(self):
        """Stop alert monitoring"""
        self.is_running = False
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        logger.info("Alert engine stopped")
    
    async def _monitor_alerts(self):
        """Monitor all active alerts"""
        while self.is_running:
            try:
                db = SessionLocal()
                try:
                    active_alerts = db.query(Alert).filter(Alert.is_active == True).all()
                    
                    for alert in active_alerts:
                        await self._check_alert(alert, db)
                    
                finally:
                    db.close()
                
                # Check alerts every 5 seconds
                await asyncio.sleep(5)
                
            except Exception as e:
                logger.error(f"Error in alert monitoring: {e}")
                await asyncio.sleep(5)
    
    async def _check_alert(self, alert: Alert, db: Session):
        """Check if alert condition is met"""
        try:
            if alert.condition_type == "PRICE_ABOVE":
                current_price = MT5Bridge.get_current_price(alert.symbol)
                if current_price and alert.condition_value:
                    if current_price["bid"] >= float(alert.condition_value):
                        await self._trigger_alert(alert, current_price, db)
            
            elif alert.condition_type == "PRICE_BELOW":
                current_price = MT5Bridge.get_current_price(alert.symbol)
                if current_price and alert.condition_value:
                    if current_price["bid"] <= float(alert.condition_value):
                        await self._trigger_alert(alert, current_price, db)
            
            # Add more condition types as needed
            
        except Exception as e:
            logger.error(f"Error checking alert {alert.id}: {e}")
    
    async def _trigger_alert(self, alert: Alert, price_data: dict, db: Session):
        """Trigger alert and send webhook"""
        try:
            # Prepare alert data
            alert_data = {
                "alert_id": str(alert.id),
                "symbol": alert.symbol,
                "condition_type": alert.condition_type,
                "condition_value": str(alert.condition_value) if alert.condition_value else None,
                "timeframe": alert.timeframe,
                "current_price": price_data["bid"],
                "timestamp": datetime.utcnow().isoformat(),
            }
            
            # Send webhook via Celery task
            send_webhook_alert.delay(alert.webhook_url, alert_data)
            
            # Update alert last_triggered
            alert.last_triggered = datetime.utcnow()
            db.commit()
            
            logger.info(f"Alert {alert.id} triggered for {alert.symbol}")
            
        except Exception as e:
            logger.error(f"Error triggering alert {alert.id}: {e}")


# Global alert engine instance
alert_engine = AlertEngine()

