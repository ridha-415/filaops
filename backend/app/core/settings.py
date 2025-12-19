"""
FilaOps ERP - Configuration Management with pydantic-settings

Provides validated, type-safe configuration from environment variables.
All settings can be overridden via environment variables or .env file.
"""
import json
from functools import lru_cache
from pathlib import Path
from typing import Optional, List, Dict, Any
from decimal import Decimal
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Calculate path to .env in project root (4 levels up from this file)
# backend/app/core/settings.py -> filaops/.env
_ENV_FILE = Path(__file__).resolve().parent.parent.parent.parent / ".env"


class Settings(BaseSettings):
    """
    Application settings with validation.

    Environment variables take precedence over .env file values.
    Prefix BLB3D_ can be used for any setting (e.g., BLB3D_DEBUG=true).
    """

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore extra env vars
    )

    # ===================
    # Application Settings
    # ===================
    PROJECT_NAME: str = "FilaOps"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = Field(default=False, description="Enable debug mode")
    ENVIRONMENT: str = Field(default="development", description="deployment environment")

    # ===================
    # Database Settings
    # ===================
    DB_HOST: str = Field(default="localhost\\SQLEXPRESS", description="SQL Server host")
    DB_NAME: str = Field(default="BLB3D_ERP", description="Database name")
    DB_USER: Optional[str] = Field(default=None, description="Database user (if not using trusted connection)")
    DB_PASSWORD: Optional[str] = Field(default=None, description="Database password")
    DB_TRUSTED_CONNECTION: bool = Field(default=True, description="Use Windows authentication")
    DATABASE_URL: Optional[str] = Field(default=None, description="Full database URL (overrides other DB_ settings)")

    @property
    def database_url(self) -> str:
        """Build database URL from components or use explicit URL."""
        if self.DATABASE_URL:
            return self.DATABASE_URL

        if self.DB_TRUSTED_CONNECTION:
            return f"mssql+pyodbc://{self.DB_HOST}/{self.DB_NAME}?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes"
        else:
            return f"mssql+pyodbc://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}/{self.DB_NAME}?driver=ODBC+Driver+17+for+SQL+Server"

    # ===================
    # Security Settings
    # ===================
    SECRET_KEY: str = Field(
        default="change-this-to-a-random-secret-key-in-production",
        description="JWT signing key - MUST change in production"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, description="JWT token expiration in minutes")
    API_KEY: Optional[str] = Field(default=None, description="API key for external integrations")

    @field_validator("SECRET_KEY")
    @classmethod
    def warn_default_secret(cls, v: str) -> str:
        """Validate SECRET_KEY is not using default value."""
        if "change-this" in v.lower():
            import warnings
            import os

            # Fail hard in production
            if os.getenv("ENVIRONMENT", "development").lower() == "production":
                raise ValueError(
                    "CRITICAL SECURITY ERROR: Default SECRET_KEY detected in production! "
                    "You MUST set a secure SECRET_KEY environment variable. "
                    "Generate one with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
                )

            # Warn in development
            warnings.warn(
                "⚠️  Using default SECRET_KEY - this is insecure for production! "
                "Set SECRET_KEY environment variable before deploying.",
                UserWarning,
                stacklevel=2
            )
        return v

    # ===================
    # CORS Settings
    # ===================
    ALLOWED_ORIGINS: List[str] = Field(
        default=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",  # Dev frontend
            "http://127.0.0.1:5174",  # Dev frontend
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8001",  # Backend itself
            "http://127.0.0.1:8001",  # Backend itself
        ],
        description="Allowed CORS origins"
    )

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse comma-separated string to list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @model_validator(mode="after")
    def add_frontend_url_to_cors(self):
        """Automatically add FRONTEND_URL to ALLOWED_ORIGINS for remote access."""
        if self.FRONTEND_URL and self.FRONTEND_URL not in self.ALLOWED_ORIGINS:
            self.ALLOWED_ORIGINS = list(self.ALLOWED_ORIGINS) + [self.FRONTEND_URL]
        return self

    # ===================
    # Bambu Print Suite Integration
    # ===================
    BAMBU_SUITE_API_URL: str = Field(
        default="http://localhost:8001",
        description="Bambu Print Suite API URL"
    )
    BAMBU_SUITE_API_KEY: Optional[str] = Field(default=None, description="API key for Bambu Suite")

    # ===================
    # File Storage Settings
    # ===================
    UPLOAD_DIR: str = Field(default="./uploads/quotes", description="Directory for uploaded files")
    MAX_FILE_SIZE_MB: int = Field(default=100, description="Maximum upload file size in MB")
    ALLOWED_FILE_FORMATS: List[str] = Field(
        default=[".3mf", ".stl"],
        description="Allowed file upload extensions"
    )

    @field_validator("ALLOWED_FILE_FORMATS", mode="before")
    @classmethod
    def parse_file_formats(cls, v):
        """Parse comma-separated string to list."""
        if isinstance(v, str):
            return [fmt.strip() for fmt in v.split(",") if fmt.strip()]
        return v

    # ===================
    # Google Cloud Storage
    # ===================
    GCS_ENABLED: bool = Field(default=False, description="Enable GCS backup")
    GCS_BUCKET_NAME: str = Field(default="blb3d-quote-files", description="GCS bucket name")
    GCS_PROJECT_ID: Optional[str] = Field(default=None, description="GCP project ID")
    GCS_CREDENTIALS_PATH: Optional[str] = Field(default=None, description="Path to GCS service account JSON")

    # ===================
    # Google Drive Integration
    # ===================
    GDRIVE_ENABLED: bool = Field(default=False, description="Enable Google Drive integration")
    GDRIVE_CREDENTIALS_PATH: Optional[str] = Field(default=None, description="Path to Drive credentials")
    GDRIVE_FOLDER_ID: Optional[str] = Field(default=None, description="Drive folder ID for uploads")

    # ===================
    # Stripe Payment Integration
    # ===================
    STRIPE_SECRET_KEY: Optional[str] = Field(default=None, description="Stripe secret API key")
    STRIPE_PUBLISHABLE_KEY: Optional[str] = Field(default=None, description="Stripe publishable key")
    STRIPE_WEBHOOK_SECRET: Optional[str] = Field(default=None, description="Stripe webhook signing secret")

    # ===================
    # EasyPost Shipping Integration
    # ===================
    EASYPOST_API_KEY: Optional[str] = Field(default=None, description="EasyPost API key")
    EASYPOST_TEST_MODE: bool = Field(default=True, description="Use EasyPost test mode")

    # ===================
    # Email Configuration (SMTP)
    # ===================
    SMTP_HOST: str = Field(default="smtp.gmail.com", description="SMTP server host")
    SMTP_PORT: int = Field(default=587, description="SMTP server port")
    SMTP_USER: Optional[str] = Field(default=None, description="SMTP username")
    SMTP_PASSWORD: Optional[str] = Field(default=None, description="SMTP password")
    SMTP_FROM_EMAIL: str = Field(default="noreply@example.com", description="From email address")
    SMTP_FROM_NAME: str = Field(default="Your Company Name", description="From display name")
    SMTP_TLS: bool = Field(default=True, description="Use TLS for SMTP")

    # ===================
    # Admin Settings
    # ===================
    ADMIN_APPROVAL_EMAIL: str = Field(
        default="admin@example.com",
        description="Admin email for approvals"
    )
    BUSINESS_EMAIL: str = Field(
        default="info@yourcompany.com",
        description="Business support/contact email address"
    )
    BUSINESS_NAME: str = Field(
        default="Your Company Name",
        description="Business name for emails and branding"
    )

    # ===================
    # Ship From Address (Business Address)
    # ===================
    # NOTE: These default values should be configured via environment variables
    # for production deployments. Replace with your actual business address.
    SHIP_FROM_NAME: str = Field(default="Your Company Name")
    SHIP_FROM_STREET1: str = Field(default="123 Main Street")
    SHIP_FROM_STREET2: Optional[str] = Field(default=None)
    SHIP_FROM_CITY: str = Field(default="Your City")
    SHIP_FROM_STATE: str = Field(default="ST")
    SHIP_FROM_ZIP: str = Field(default="12345")
    SHIP_FROM_COUNTRY: str = Field(default="US")
    SHIP_FROM_PHONE: str = Field(default="555-555-5555")

    # ===================
    # Frontend Settings
    # ===================
    FRONTEND_URL: str = Field(default="http://localhost:5173", description="Frontend URL for redirects")

    # ===================
    # Redis / Background Jobs
    # ===================
    REDIS_URL: Optional[str] = Field(default=None, description="Redis URL for Celery")

    # ===================
    # Logging Settings
    # ===================
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")
    LOG_FORMAT: str = Field(default="json", description="Log format: json or text")
    LOG_FILE: Optional[str] = Field(default=None, description="Log file path (optional)")
    AUDIT_LOG_FILE: Optional[str] = Field(default="./logs/audit.log", description="Audit log file path")

    # ===================
    # WooCommerce Integration (future)
    # ===================
    WOOCOMMERCE_URL: Optional[str] = Field(default=None, description="WooCommerce store URL")
    WOOCOMMERCE_KEY: Optional[str] = Field(default=None, description="WooCommerce consumer key")
    WOOCOMMERCE_SECRET: Optional[str] = Field(default=None, description="WooCommerce consumer secret")
    WOOCOMMERCE_WEBHOOK_SECRET: Optional[str] = Field(default=None, description="WooCommerce webhook secret")

    # ===================
    # QuickBooks Integration (future)
    # ===================
    QUICKBOOKS_CLIENT_ID: Optional[str] = Field(default=None)
    QUICKBOOKS_CLIENT_SECRET: Optional[str] = Field(default=None)
    QUICKBOOKS_REDIRECT_URI: Optional[str] = Field(default=None)
    QUICKBOOKS_ENVIRONMENT: str = Field(default="sandbox")

    # ===================
    # Product Tier Settings
    # ===================
    TIER: str = Field(
        default="open",
        description="Product tier: open, pro, or enterprise"
    )
    LICENSE_KEY: Optional[str] = Field(
        default=None,
        description="License key for Pro/Enterprise features"
    )

    # ===================
    # MRP (Material Requirements Planning) Settings
    # ===================
    # All MRP features are disabled by default for safety and backward compatibility
    INCLUDE_SALES_ORDERS_IN_MRP: bool = Field(
        default=False,
        description="Include Sales Orders as independent demand in MRP calculations (default: False for safety)"
    )
    AUTO_MRP_ON_ORDER_CREATE: bool = Field(
        default=False,
        description="Automatically trigger MRP check when Sales Order is created (default: False for safety)"
    )
    AUTO_MRP_ON_SHIPMENT: bool = Field(
        default=False,
        description="Automatically trigger MRP recalculation after order ships (default: False for safety)"
    )
    AUTO_MRP_ON_CONFIRMATION: bool = Field(
        default=False,
        description="Automatically trigger MRP when Sales Order is confirmed (default: False for safety)"
    )
    MRP_ENABLE_SUB_ASSEMBLY_CASCADING: bool = Field(
        default=False,
        description="Enable due date cascading for sub-assemblies (default: False until validated)"
    )
    MRP_VALIDATION_STRICT_MODE: bool = Field(
        default=True,
        description="Enable strict validation for MRP calculations (default: True)"
    )

    # ===================
    # Manufacturing Settings
    # ===================
    MACHINE_HOURLY_RATE: float = Field(
        default=1.50,
        description="Fully-burdened machine time cost per hour (depreciation + electricity + maintenance)"
    )
    MACHINE_TIME_SKU: str = Field(
        default="MFG-MACHINE-TIME",
        description="SKU for machine time manufacturing overhead product"
    )
    LEGACY_MACHINE_TIME_SKU: str = Field(
        default="SVC-MACHINE-TIME",
        description="Legacy SKU for machine time (for migration)"
    )

    # ===================
    # Pricing Settings
    # ===================
    # Material costs per gram (can be overridden via env vars as JSON)
    MATERIAL_COST_PLA: float = Field(default=0.017, description="PLA cost per gram ($16.99/kg)")
    MATERIAL_COST_PETG: float = Field(default=0.017, description="PETG cost per gram ($16.99/kg)")
    MATERIAL_COST_ABS: float = Field(default=0.020, description="ABS cost per gram ($20.00/kg)")
    MATERIAL_COST_ASA: float = Field(default=0.020, description="ASA cost per gram ($20.00/kg)")
    MATERIAL_COST_TPU: float = Field(default=0.033, description="TPU cost per gram ($33.00/kg)")

    # Markup multipliers (material-specific)
    MARKUP_PLA: float = Field(default=3.5, description="PLA markup multiplier")
    MARKUP_PETG: float = Field(default=3.5, description="PETG markup multiplier")
    MARKUP_ABS: float = Field(default=4.0, description="ABS markup multiplier")
    MARKUP_ASA: float = Field(default=4.0, description="ASA markup multiplier")
    MARKUP_TPU: float = Field(default=4.5, description="TPU markup multiplier")

    # Business rules
    MINIMUM_ORDER_VALUE: float = Field(default=10.00, description="Minimum order value in dollars")
    AUTO_APPROVE_THRESHOLD: float = Field(default=50.00, description="Auto-approve quotes under this amount")
    QUOTE_EXPIRATION_DAYS: int = Field(default=30, description="Quote validity period in days")

    # ABS/ASA size limits (mm) - require manual review if exceeded
    ABS_ASA_MAX_X_MM: int = Field(default=200, description="Max X dimension for ABS/ASA auto-approval")
    ABS_ASA_MAX_Y_MM: int = Field(default=200, description="Max Y dimension for ABS/ASA auto-approval")
    ABS_ASA_MAX_Z_MM: int = Field(default=100, description="Max Z dimension for ABS/ASA auto-approval")

    # Delivery estimation
    PRINTING_HOURS_PER_DAY: int = Field(default=8, description="Assumed productive printing hours per day")
    PROCESSING_BUFFER_DAYS: int = Field(default=2, description="Days added for QC, packaging, shipping")
    RUSH_48H_REDUCTION_DAYS: int = Field(default=3, description="Days reduced for 48h rush orders")
    RUSH_24H_REDUCTION_DAYS: int = Field(default=4, description="Days reduced for 24h rush orders")

    # Quantity discounts (JSON format: [{"min_quantity": 100, "discount": 0.30}, ...])
    QUANTITY_DISCOUNTS: Optional[str] = Field(
        default=None,
        description="Quantity discounts as JSON. Default: 10% at 10+, 20% at 50+, 30% at 100+"
    )

    # Finish costs (JSON format: {"standard": 0.00, "cleanup": 3.00, ...})
    FINISH_COSTS: Optional[str] = Field(
        default=None,
        description="Finish upcharges as JSON. Default: standard=0, cleanup=3, sanded=8, painted=20"
    )

    # Rush multipliers (JSON format: {"standard": 1.0, "fast": 1.25, ...})
    RUSH_MULTIPLIERS: Optional[str] = Field(
        default=None,
        description="Rush order multipliers as JSON. Default: standard=1.0, fast=1.25, rush_48h=1.5, rush_24h=2.0"
    )

    # Printer fleet configuration (JSON format)
    PRINTER_FLEET: Optional[str] = Field(
        default=None,
        description="Printer fleet configuration as JSON. Default: 4 printers (1 P1S, 3 A1)"
    )

    @field_validator("QUANTITY_DISCOUNTS", "FINISH_COSTS", "RUSH_MULTIPLIERS", "PRINTER_FLEET", mode="before")
    @classmethod
    def parse_json_string(cls, v):
        """Parse JSON string to dict/list, or return None if not provided"""
        if v is None or v == "":
            return None
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return None
        return v

    @property
    def material_costs(self) -> Dict[str, Decimal]:
        """Get material costs dictionary"""
        return {
            'PLA': Decimal(str(self.MATERIAL_COST_PLA)),
            'PETG': Decimal(str(self.MATERIAL_COST_PETG)),
            'ABS': Decimal(str(self.MATERIAL_COST_ABS)),
            'ASA': Decimal(str(self.MATERIAL_COST_ASA)),
            'TPU': Decimal(str(self.MATERIAL_COST_TPU)),
        }

    @property
    def markup_multipliers(self) -> Dict[str, Decimal]:
        """Get markup multipliers dictionary"""
        return {
            'PLA': Decimal(str(self.MARKUP_PLA)),
            'PETG': Decimal(str(self.MARKUP_PETG)),
            'ABS': Decimal(str(self.MARKUP_ABS)),
            'ASA': Decimal(str(self.MARKUP_ASA)),
            'TPU': Decimal(str(self.MARKUP_TPU)),
        }

    @property
    def quantity_discounts(self) -> List[Dict[str, Any]]:
        """Get quantity discounts list, with defaults if not configured"""
        if self.QUANTITY_DISCOUNTS and isinstance(self.QUANTITY_DISCOUNTS, list):
            return [{'min_quantity': d['min_quantity'], 'discount': Decimal(str(d['discount']))} for d in self.QUANTITY_DISCOUNTS]  # type: ignore[union-attr]
        return [
            {'min_quantity': 100, 'discount': Decimal('0.30')},
            {'min_quantity': 50, 'discount': Decimal('0.20')},
            {'min_quantity': 10, 'discount': Decimal('0.10')},
        ]

    @property
    def finish_costs(self) -> Dict[str, Decimal]:
        """Get finish costs dictionary, with defaults if not configured"""
        if self.FINISH_COSTS and isinstance(self.FINISH_COSTS, dict):
            return {k: Decimal(str(v)) for k, v in self.FINISH_COSTS.items()}  # type: ignore[union-attr]
        return {
            'standard': Decimal('0.00'),
            'cleanup': Decimal('3.00'),
            'sanded': Decimal('8.00'),
            'painted': Decimal('20.00'),
            'custom': Decimal('0.00'),
        }

    @property
    def rush_multipliers(self) -> Dict[str, Decimal]:
        """Get rush multipliers dictionary, with defaults if not configured"""
        if self.RUSH_MULTIPLIERS and isinstance(self.RUSH_MULTIPLIERS, dict):
            return {k: Decimal(str(v)) for k, v in self.RUSH_MULTIPLIERS.items()}  # type: ignore[union-attr]
        return {
            'standard': Decimal('1.0'),
            'fast': Decimal('1.25'),
            'rush_48h': Decimal('1.5'),
            'rush_24h': Decimal('2.0'),
        }

    @property
    def printer_fleet_config(self) -> Dict[str, Any]:
        """Get printer fleet configuration, with defaults if not configured"""
        if self.PRINTER_FLEET and isinstance(self.PRINTER_FLEET, dict):
            return self.PRINTER_FLEET  # type: ignore[return-value]
        return {
            'total_printers': 4,
            'printers': [
                {'model': 'Bambu P1S', 'quantity': 1},
                {'model': 'Bambu A1', 'quantity': 3},
            ],
            'daily_capacity_hours': 80,
            'average_hours_per_printer_per_day': 20
        }

    @property
    def abs_asa_size_limits(self) -> Dict[str, int]:
        """Get ABS/ASA size limits"""
        return {
            'max_x_mm': self.ABS_ASA_MAX_X_MM,
            'max_y_mm': self.ABS_ASA_MAX_Y_MM,
            'max_z_mm': self.ABS_ASA_MAX_Z_MM,
        }

    @property
    def delivery_estimation(self) -> Dict[str, Any]:
        """Get delivery estimation parameters"""
        return {
            'printing_hours_per_day': self.PRINTING_HOURS_PER_DAY,
            'processing_buffer_days': self.PROCESSING_BUFFER_DAYS,
            'rush_reduction_days': {
                'rush_48h': self.RUSH_48H_REDUCTION_DAYS,
                'rush_24h': self.RUSH_24H_REDUCTION_DAYS,
            }
        }

    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.ENVIRONMENT.lower() == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development."""
        return self.ENVIRONMENT.lower() == "development"

    @property
    def is_pro_tier(self) -> bool:
        """Check if Pro tier or higher"""
        return self.TIER.lower() in ("pro", "enterprise")

    @property
    def is_enterprise_tier(self) -> bool:
        """Check if Enterprise tier"""
        return self.TIER.lower() == "enterprise"


@lru_cache
def get_settings() -> Settings:
    """
    Get cached settings instance.

    Using lru_cache ensures settings are only loaded once per process,
    improving performance and ensuring consistency.
    """
    return Settings()


# Convenience alias for backward compatibility with existing code
settings = get_settings()
