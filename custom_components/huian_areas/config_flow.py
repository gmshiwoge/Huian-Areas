"""Config flow for Huian Areas integration."""

from homeassistant import config_entries

from .const import DOMAIN


class HuianAreasConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Huian Areas."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Handle the initial step."""

        # Check if already configured
        if self._async_current_entries():
            return self.async_abort(reason="already_configured")

        # Since no user input is needed, immediately create an entry
        return self.async_create_entry(title="Huian Areas", data={})
