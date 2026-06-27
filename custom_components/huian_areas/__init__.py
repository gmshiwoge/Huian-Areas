"""The Huian Areas component."""
import logging
import os

from aiohttp import web
from homeassistant import config_entries, core
from homeassistant.components import frontend
from homeassistant.helpers import device_registry, entity_registry

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: core.HomeAssistant, entry: config_entries.ConfigEntry
) -> bool:
    """Set up Huian Areas from a config entry."""

    # Get the path of the current file
    current_file_path = os.path.dirname(os.path.abspath(__file__))

    # Construct the path to your JavaScript file
    www_path = os.path.join(current_file_path, "www")

    # Register a new static path for serving your custom panel
    hass.http.app.router.add_static("/Huian-Areas-www", www_path)

    # Add cache-busting version based on file modification time
    panel_js_path = os.path.join(www_path, "panel.js")
    panel_version = str(int(os.path.getmtime(panel_js_path)))
    frontend.add_extra_js_url(hass, f"/Huian-Areas-www/panel.js?v={panel_version}")

    # Register the custom panel
    frontend.async_register_built_in_panel(
        hass,
        component_name="Huian-Areas",
        sidebar_title="Areas",
        sidebar_icon="mdi:sofa",
        require_admin=True,
    )

    async def update_device(call):
        """Handle the service call."""
        device_id = call.data.get("device_id")
        new_area = call.data.get("area_id")

        dev_reg = device_registry.async_get(hass)
        device = dev_reg.devices.get(device_id)

        if device is None:
            _LOGGER.error("Device not found: %s", device_id)
            return

        dev_reg.async_update_device(device_id, area_id=new_area)

    async def update_entity(call):
        """Handle the entity update service call."""
        entity_id = call.data.get("entity_id")
        new_area = call.data.get("area_id")

        ent_reg = entity_registry.async_get(hass)
        
        if not ent_reg.async_is_registered(entity_id):
            _LOGGER.error("Entity not found: %s", entity_id)
            return

        ent_reg.async_update_entity(entity_id, area_id=new_area)

    hass.services.async_register(DOMAIN, "update_device", update_device)
    hass.services.async_register(DOMAIN, "update_entity", update_entity)

    return True


async def async_unload_entry(
    hass: core.HomeAssistant, entry: config_entries.ConfigEntry
) -> bool:
    """Unload a config entry."""

    frontend.async_remove_panel(
        hass,
        frontend_url_path="Huian-Areas",
    )

    return True
