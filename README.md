# Huian Areas

Custom Home Assistant integration to assign devices and entities to areas in bulk.

> Modified from the [HA Data Editor](https://github.com/dmoreira/ha-data-editor) integration.

## Features

- Custom sidebar panel ("Areas") for managing area assignments
- Services to update device and entity area assignments programmatically
- Supports Home Assistant area registry

## Installation

### via HACS

1. Add this repository to HACS as a custom repository: `https://github.com/gmshiwoge/Huian-Areas`
2. Search for "Huian Areas" in HACS and install it
3. Restart Home Assistant
4. Add the integration via **Settings → Devices & Services → Add Integration**

### Manual

1. Copy the `custom_components/huian_areas` directory into your `custom_components/` folder
2. Restart Home Assistant
3. Add the integration via **Settings → Devices & Services → Add Integration**

## Services

### `huian_areas.update_device`

Assign a device to an area.

| Field | Description | Required |
| --- | --- | --- |
| `device_id` | The device to update | yes |
| `area_id` | The new area to assign | yes |

### `huian_areas.update_entity`

Assign an entity to an area.

| Field | Description | Required |
| --- | --- | --- |
| `entity_id` | The entity to update | yes |
| `area_id` | The new area to assign | yes |

## License

MIT