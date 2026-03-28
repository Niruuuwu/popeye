"""Unit tests for Sentry initialization in main.py (Requirements 6.1, 6.2, 6.4, 6.5)."""
import importlib
import logging
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


def _make_mock_settings(sentry_dsn: str, traces_sample_rate: float = 1.0):
    mock_settings = MagicMock()
    mock_settings.SENTRY_DSN = sentry_dsn
    mock_settings.SENTRY_TRACES_SAMPLE_RATE = traces_sample_rate
    return mock_settings


class TestSentryInitialization:
    def test_sentry_init_called_when_dsn_present(self):
        """Sentry is initialized with DSN and traces_sample_rate when DSN is non-empty."""
        import backend.main as main_module

        mock_settings = _make_mock_settings("https://key@sentry.io/123", 0.5)

        with patch("backend.config.settings", mock_settings), \
             patch("sentry_sdk.init") as mock_init, \
             patch("sentry_sdk.integrations.fastapi.FastApiIntegration"):
            importlib.reload(main_module)
            mock_init.assert_called_once()
            call_kwargs = mock_init.call_args.kwargs
            assert call_kwargs["dsn"] == "https://key@sentry.io/123"
            assert call_kwargs["traces_sample_rate"] == 0.5

    def test_sentry_init_not_called_when_dsn_empty(self):
        """sentry_sdk.init is NOT called when SENTRY_DSN is empty."""
        import backend.main as main_module

        mock_settings = _make_mock_settings("")

        with patch("backend.config.settings", mock_settings), \
             patch("sentry_sdk.init") as mock_init:
            importlib.reload(main_module)
            mock_init.assert_not_called()

    def test_warning_logged_when_dsn_empty(self, caplog):
        """A WARNING is logged when SENTRY_DSN is absent/empty."""
        import backend.main as main_module

        mock_settings = _make_mock_settings("")

        with patch("backend.config.settings", mock_settings), \
             patch("sentry_sdk.init"), \
             caplog.at_level(logging.WARNING, logger="backend.main"):
            importlib.reload(main_module)
            assert any(
                "SENTRY_DSN not set" in record.message for record in caplog.records
            )

    def test_no_warning_logged_when_dsn_present(self, caplog):
        """No DSN-missing warning is logged when SENTRY_DSN is set."""
        import backend.main as main_module

        mock_settings = _make_mock_settings("https://key@sentry.io/123")

        with patch("backend.config.settings", mock_settings), \
             patch("sentry_sdk.init"), \
             patch("sentry_sdk.integrations.fastapi.FastApiIntegration"), \
             caplog.at_level(logging.WARNING, logger="backend.main"):
            importlib.reload(main_module)
            assert not any(
                "SENTRY_DSN not set" in record.message for record in caplog.records
            )


class TestGlobalExceptionHandler:
    def test_global_exception_handler_returns_500(self):
        """Unhandled exceptions return HTTP 500 with expected body."""
        import backend.main as main_module

        mock_settings = _make_mock_settings("")

        with patch("backend.config.settings", mock_settings), \
             patch("sentry_sdk.init"), \
             patch("sentry_sdk.capture_exception"):
            importlib.reload(main_module)
            app = main_module.app

            # Add a route that raises an unhandled exception
            @app.get("/test-error")
            async def raise_error():
                raise RuntimeError("boom")

            client = TestClient(app, raise_server_exceptions=False)
            response = client.get("/test-error")
            assert response.status_code == 500
            assert response.json() == {"detail": "Internal server error"}

    def test_global_exception_handler_calls_capture_exception(self):
        """sentry_sdk.capture_exception is called for unhandled exceptions."""
        import backend.main as main_module

        mock_settings = _make_mock_settings("https://key@sentry.io/123")

        with patch("backend.config.settings", mock_settings), \
             patch("sentry_sdk.init"), \
             patch("sentry_sdk.integrations.fastapi.FastApiIntegration"), \
             patch("sentry_sdk.capture_exception") as mock_capture:
            importlib.reload(main_module)
            app = main_module.app

            exc = RuntimeError("test exception")

            @app.get("/test-capture")
            async def raise_capture():
                raise exc

            client = TestClient(app, raise_server_exceptions=False)
            client.get("/test-capture")
            mock_capture.assert_called()
