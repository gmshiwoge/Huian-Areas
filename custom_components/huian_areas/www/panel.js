class HaDataEditorPanel extends HTMLElement {
    constructor() {
        super();
        this._hass = null;
        this._lastRenderKey = '';
        this._pendingType = '';
        this._editingArea = null;
        this._assignTab = 'entity';
        this._manageMode = 'assign'; // 'assign' | 'manage'
        this._mainSearch = '';

        // 点击组件外部时关闭所有开放的楼层菜单
        document.addEventListener('click', (e) => {
            if (!document.contains(this)) return;
            if (!this.contains(e.target)) return;
            if (!e.target.closest('.hade-floor-menu')) {
                this.querySelectorAll('.hade-floor-menu-dropdown.open').forEach((dd) => dd.classList.remove('open'));
            }
        });
    }

    _L() {
        return {
            unassigned_floors: { 'zh-Hans':'未指定区域', en:'Unassigned Areas' },
            create_floor: { 'zh-Hans':'创建楼层', en:'Create Floor' },
            create_area: { 'zh-Hans':'创建区域', en:'Create Area' },
            create_area_floor: { 'zh-Hans':'所属楼层', en:'Floor' },
            no_areas: { 'zh-Hans':'暂无区域', en:'No Areas' },
            create: { 'zh-Hans':'创建', en:'Create' },
            name: { 'zh-Hans':'名称', en:'Name' },
            update_area: { 'zh-Hans':'更新区域', en:'Update Area' },
            area_id: { 'zh-Hans':'区域标识符', en:'Area ID' },
            icon: { 'zh-Hans':'图标', en:'Icon' },
            browse_icons: { 'zh-Hans':'浏览图标', en:'Browse Icons' },
            search_icons: { 'zh-Hans':'搜索图标...', en:'Search icons...' },
            floor: { 'zh-Hans':'楼层', en:'Floor' },
            labels: { 'zh-Hans':'标签', en:'Labels' },
            labels_placeholder: { 'zh-Hans':'用逗号分隔', en:'Separated by commas' },
            picture: { 'zh-Hans':'图片', en:'Picture' },
            picture_url: { 'zh-Hans':'图片 URL', en:'Picture URL' },
            picture_hint: { 'zh-Hans':'支持 JPEG、PNG 或 GIF 图像。', en:'Supports JPEG, PNG, or GIF images.' },
            related_sensors: { 'zh-Hans':'相关传感器', en:'Related Sensors' },
            temp_sensor: { 'zh-Hans':'温度传感器', en:'Temperature Sensor' },
            select_entity: { 'zh-Hans':'选择一个实体', en:'Select an entity' },
            temp_sensor_hint: { 'zh-Hans':'代表区域温度的传感器。', en:'Sensor representing the area temperature.' },
            humid_sensor: { 'zh-Hans':'湿度传感器', en:'Humidity Sensor' },
            humid_sensor_hint: { 'zh-Hans':'代表区域湿度的传感器。', en:'Sensor representing the area humidity.' },
            delete: { 'zh-Hans':'删除', en:'Delete' },
            save: { 'zh-Hans':'保存', en:'Save' },
            entities: { 'zh-Hans':'实体', en:'Entities' },
            devices: { 'zh-Hans':'设备', en:'Devices' },
            select_all: { 'zh-Hans':'全选', en:'Select All' },
            deselect_all: { 'zh-Hans':'取消全选', en:'Deselect All' },
            search: { 'zh-Hans':'搜索...', en:'Search...' },
            sort_by_type: { 'zh-Hans':'按类型', en:'By Type' },
            sort_by_name: { 'zh-Hans':'按名称', en:'By Name' },
            sort_by_area: { 'zh-Hans':'按区域', en:'By Area' },
            sort_by_integration: { 'zh-Hans':'按集成', en:'By Integration' },
            manage_title: { 'zh-Hans':'管理', en:'Manage' },
            manage_added: { 'zh-Hans':'管理已添加', en:'Manage Added' },
            add_to_title: { 'zh-Hans':'添加到：', en:'Add to: ' },
            no_match: { 'zh-Hans':'无匹配项', en:'No matches' },
            unspecified: { 'zh-Hans':'— 未指定 —', en:'— Unspecified —' },
            device_tag: { 'zh-Hans':'设备', en:'Device' },
            unspecified_area: { 'zh-Hans':'未指定', en:'Unspecified' },
            assigned: { 'zh-Hans':'已分配', en:'Assigned' },
            unassigned_dev: { 'zh-Hans':'未分配', en:'Unassigned' },
            selected_count: { 'zh-Hans':'已选', en:'Selected' },
            confirm_delete: { 'zh-Hans':'确定要删除区域"%s"吗？', en:'Are you sure you want to delete area "%s"?' },
            manage_entity_device: { 'zh-Hans':'管理已添加', en:'Manage Added' },
            add_entity_device: { 'zh-Hans':'添加实体/设备', en:'Add Entity/Device' },
            entity_count: { 'zh-Hans':'%s 个实体', en:'%s entities' },
            edit_floor: { 'zh-Hans':'编辑楼层', en:'Edit Floor' },
            delete_floor: { 'zh-Hans':'删除楼层', en:'Delete Floor' },
            edit_floor_name: { 'zh-Hans':'编辑楼层名称', en:'Edit Floor Name' },
            floor_name_label: { 'zh-Hans':'名称', en:'Name' },
            confirm_delete_floor: { 'zh-Hans':'确定要删除楼层"%s"吗？', en:'Are you sure you want to delete floor "%s"?' },
        };
    }

    _t(key) {
        const lang = this._hass && this._hass.language ? this._hass.language : 'en';
        const dict = this._L();
        const entry = dict[key];
        if (!entry) return key;
        const val = entry[lang] || entry['en'] || key;
        const args = Array.prototype.slice.call(arguments, 1);
        if (args.length) {
            let result = val;
            for (let i = 0; i < args.length; i++) {
                result = result.replace('%s', args[i]);
            }
            return result;
        }
        return val;
    }

    set hass(hass) {
        this._hass = hass;
        const key = JSON.stringify(hass.areas) + JSON.stringify(hass.floors || {}) + JSON.stringify(hass.entities || {}) + JSON.stringify(hass.devices || {});
        if (key !== this._lastRenderKey && this.isConnected) {
            this._lastRenderKey = key;
            this.render();
        }
    }

    connectedCallback() {
        if (this._hass) { this.render(); }
    }

    /* ========== 渲染 ========== */

    render() {
        const hass = this._hass;
        if (!hass) return;

        const t = this._t.bind(this);

        if (!this._skeletonBuilt) {
            this._skeletonBuilt = true;
            this.innerHTML = `
<style>
    ha-panel-huian-areas { display: block; min-height: 100vh; }
    .hade-header { font-size: var(--ha-font-size-xl); height: var(--toolbar-height, 56px); padding: 0 16px; padding-top: var(--safe-area-inset-top, 0px); padding-right: var(--safe-area-inset-right, 0px); background-color: var(--primary-background-color); font-weight: var(--ha-font-weight-normal); border-bottom: 1px solid var(--divider-color); box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; color: var(--primary-text-color); position: sticky; top: 0; z-index: 100; }
    .hade-header-title { font-size: var(--ha-font-size-xl); font-weight: 500; }
    .hade-header-actions { display: flex; gap: 4px; }
    .hade-container { padding: 24px 16px 100px; background: var(--primary-background-color); min-height: calc(100vh - var(--toolbar-height, 56px)); }
    .hade-floor { margin-bottom: 32px; }
    .hade-floor-title { font-size: 14px; font-weight: 500; margin: 0; color: var(--secondary-text-color); }
    .hade-floor-header { display: flex; align-items: center; gap: 8px; margin: 0 0 16px; }
    .hade-floor-header--no-menu { display: block; margin: 0 0 16px; }
    .hade-floor-menu-trigger { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; color: var(--secondary-text-color); transition: background 0.15s, color 0.15s; }
    .hade-floor-menu-trigger:hover { background: var(--divider-color); color: var(--primary-text-color); }
    .hade-floor-menu { margin-left: auto; position: relative; display: inline-block; }
    .hade-floor-menu-dropdown { display: none; position: absolute; top: 100%; right: 0; background: var(--ha-card-background, var(--card-background-color, #fff)); border-radius: 12px; box-shadow: var(--ha-dialog-box-shadow, 0px 5px 15px rgba(0,0,0,0.2)); min-width: 160px; z-index: 100; overflow: hidden; }
    .hade-floor-menu-dropdown.open { display: block; }
    .hade-floor-menu-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; font-size: 13px; cursor: pointer; color: var(--primary-text-color); transition: background 0.15s; }
    .hade-floor-menu-item:hover { background: var(--divider-color); }
    .hade-floor-menu-item--danger { color: var(--error-color, #d32f2f); }
    .hade-floor-menu-item--danger:hover { background: rgba(var(--rgb-error-color), 0.08); }
    .hade-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
    .hade-card { overflow: hidden; cursor: pointer; position: relative; }
    .hade-card-pic { height: 100px; background-size: cover; background-position: center; border-radius: var(--ha-card-border-radius, 12px) var(--ha-card-border-radius, 12px) 0 0; }
    .hade-card-pic--placeholder { height: 100px; background-color: var(--sidebar-selected-icon-color); opacity: 0.12; border-radius: var(--ha-card-border-radius, 12px) var(--ha-card-border-radius, 12px) 0 0; }
    .hade-card-actions { position: absolute; top: 6px; right: 6px; display: flex; gap: 4px; z-index: 2; }
    .hade-card-btn { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; cursor: pointer; color: var(--secondary-text-color); transition: color 0.15s; }
    .hade-card-btn:hover { color: var(--primary-text-color); }
    .hade-card-body { padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; }
    .hade-card-name { font-weight: 500; font-size: 12px; color: var(--secondary-text-color); }
    .hade-card-count { font-size: 11px; color: var(--secondary-text-color); margin-top: 2px; }
    .hade-empty { color: var(--secondary-text-color); padding: 16px 0; }
    .hade-pencil-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: var(--secondary-text-color); margin-right: 4px; transition: background 0.15s, color 0.15s; }
    .hade-pencil-btn:hover { background: var(--divider-color); color: var(--primary-text-color); }
    .hade-fabs { position: fixed; bottom: 24px; right: 24px; display: flex; flex-direction: row; gap: 12px; z-index: 10; }
    .hade-fab-btn { display: inline-flex; align-items: center; gap: 8px; height: 48px; padding: 0 20px; border: none; border-radius: 9999px; background: var(--primary-color); color: var(--text-primary-color, #fff); font-size: 15px; font-weight: 500; font-family: inherit; cursor: pointer; box-shadow: 0 3px 5px -1px rgba(0,0,0,0.2), 0 6px 10px 0 rgba(0,0,0,0.14), 0 1px 18px 0 rgba(0,0,0,0.12); transition: box-shadow 0.2s; }
    .hade-fab-btn:hover { box-shadow: 0 5px 5px -3px rgba(0,0,0,0.2), 0 8px 10px 1px rgba(0,0,0,0.14), 0 3px 14px 2px rgba(0,0,0,0.12); }
    .hade-fab-btn:active { box-shadow: 0 7px 8px -4px rgba(0,0,0,0.2), 0 12px 17px 2px rgba(0,0,0,0.14), 0 5px 22px 4px rgba(0,0,0,0.12); }
    .hade-fab-btn svg { width: 24px; height: 24px; fill: currentColor; flex-shrink: 0; }

    .hade-dialog-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 101; align-items: flex-start; justify-content: center; overflow: visible; padding: 40px 16px; }
    .hade-dialog-overlay.open { display: flex; }
    .hade-dialog { overflow: visible; background: var(--ha-card-background, var(--card-background-color, #fff)); border-radius: 28px; padding: 24px; width: 100%; box-shadow: var(--ha-dialog-box-shadow, 0px 11px 15px -7px rgba(0,0,0,0.2), 0px 24px 38px 3px rgba(0,0,0,0.14), 0px 9px 46px 8px rgba(0,0,0,0.12)); }
    .hade-dialog--create { max-width: 420px; }
    .hade-dialog--edit { max-width: 560px; }
    .hade-dialog--assign, .hade-dialog--manage { max-width: 640px; }
    .hade-dialog-title { margin: 0; font-size: 20px; font-weight: 500; color: var(--primary-text-color); }
    .hade-dialog-close { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; color: var(--secondary-text-color); transition: background 0.15s, color 0.15s; }
    .hade-dialog-close:hover { background: var(--divider-color); color: var(--primary-text-color); }
    .hade-edit-section { margin-bottom: 16px; }
    .hade-edit-section--row { display: flex; justify-content: space-between; align-items: center; }
    .hade-edit-section--row .hade-edit-label { margin-bottom: 0; }
    .hade-edit-label { font-size: 12px; font-weight: 500; color: var(--secondary-text-color); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .hade-edit-hint { font-size: 11px; color: var(--secondary-text-color); margin-top: 4px; line-height: 1.4; }
    .hade-edit-area-id { font-family: monospace; font-size: 13px; color: var(--secondary-text-color); padding: 8px 0; word-break: break-all; }
    .hade-select { width: 100%; height: 48px; padding: 0 36px 0 12px; border: 1px solid var(--divider-color); border-radius: 12px; font-size: 14px; font-family: inherit; background: var(--ha-card-background, var(--card-background-color, #fff)); color: var(--primary-text-color); cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='20' height='20' fill='%23666'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 8px center; }
    .hade-select:focus { outline: none; border-color: var(--primary-color); }
    .hade-input { width: 100%; height: 40px; padding: 0 12px; border: 1px solid var(--divider-color); border-radius: 12px; font-size: 14px; font-family: inherit; background: var(--ha-card-background, var(--card-background-color, #fff)); color: var(--primary-text-color); box-sizing: border-box; }
    .hade-input:focus { outline: none; border-color: var(--primary-color); }
    .hade-edit-row { display: flex; gap: 12px; }
    .hade-edit-row > * { flex: 1; }
    .hade-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--divider-color); }
    .hade-dialog-actions--edit { justify-content: space-between; }

    .hade-tabs { display: flex; background: var(--divider-color, #e0e0e0); border-radius: 12px; padding: 3px; gap: 2px; }
    .hade-tab { padding: 8px 20px; border-radius: 10px; font-size: 13px; font-weight: 500; cursor: pointer; color: var(--secondary-text-color); user-select: none; transition: background 0.2s, color 0.2s; }
    .hade-tab.active { background: var(--card-background-color, #fff); color: var(--primary-text-color); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .hade-assign-title { font-size: 16px; font-weight: 500; color: var(--primary-text-color); margin: 16px 0 8px; }
    .hade-assign-toggle { font-size: 13px; color: var(--primary-color); cursor: pointer; user-select: none; }
    .hade-assign-list { max-height: 360px; overflow-y: auto; border: 1px solid var(--divider-color); border-radius: 8px; }
    .hade-assign-row { display: flex; align-items: center; padding: 10px 14px; gap: 10px; border-bottom: 1px solid var(--divider-color); cursor: pointer; transition: background 0.1s; }
    .hade-assign-row:last-child { border-bottom: none; }
    .hade-assign-row:hover { background: var(--divider-color); }
    .hade-assign-checkbox { width: 18px; height: 18px; border: 2px solid var(--secondary-text-color); border-radius: 4px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: background 0.15s, border-color 0.15s; }
    .hade-assign-checkbox.checked { background: var(--primary-color); border-color: var(--primary-color); }
    .hade-assign-checkbox.checked::after { content: ''; width: 5px; height: 10px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); margin-top: -1px; }
    .hade-assign-info { flex: 1; min-width: 0; }
    .hade-assign-name { font-size: 13px; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hade-assign-sub { font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hade-assign-tag { font-size: 10px; padding: 2px 8px; border-radius: 10px; background: var(--divider-color); color: var(--secondary-text-color); white-space: nowrap; flex-shrink: 0; }
    .hade-assign-footer { margin-top: 12px; padding: 10px 14px; background: var(--divider-color); border-radius: 8px; font-size: 12px; color: var(--secondary-text-color); }
    .hade-assign-footer-item { display: inline-block; margin: 2px 6px 2px 0; padding: 2px 10px; background: var(--card-background-color, #fff); border-radius: 12px; font-size: 11px; }
    .hade-search-bar { padding: 8px 16px; background: var(--primary-background-color); border-bottom: 1px solid var(--divider-color); position: sticky; top: var(--toolbar-height, 56px); z-index: 99; box-sizing: border-box; }
    .hade-search-bar .hade-input { border-radius: 24px; }

</style>

<div class="hade-header">
    <span class="hade-header-title">Huian Areas</span>
    <div class="hade-header-actions">
        <ha-icon-button icon="mdi:floor-plan" label="${t('create_floor')}"></ha-icon-button>
        <ha-icon-button icon="mdi:plus" label="${t('create_area')}"></ha-icon-button>
    </div>
</div>
<div class="hade-search-bar">
    <input type="text" class="hade-input" id="hade-main-search" placeholder="${t('search')}" value="${this._mainSearch || ''}" style="width:100%;">
</div>
<div class="hade-container"></div>
<div class="hade-fabs">
    <button class="hade-fab-btn" id="hade-create-area"><svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>${t('create_area')}</button>
    <button class="hade-fab-btn" id="hade-create-floor"><svg viewBox="0 0 24 24"><path d="M3 15h8V3H3v12zm2-10h4v4H5V5zm16-2v6h-6V3h6zM5 19h4v4H5v-4zm8 0h6v-6h-6v6z"></path></svg>${t('create_floor')}</button>
</div>

<div class="hade-dialog-overlay" id="hade-dialog-overlay">

    <!-- 创建 -->
    <div class="hade-dialog hade-dialog--create" id="hade-create-dialog">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h3 class="hade-dialog-title" id="hade-dialog-title"></h3>
            <span class="hade-dialog-close" id="hade-create-close"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></span>
        </div>
        <input type="text" class="hade-input" id="hade-dialog-input" placeholder="${t('name')}" style="width:100%;">
        <div id="hade-create-floor-wrap" style="display:none;margin-top:12px;">
            <ha-select id="hade-create-floor-select" style="width:100%;"><ha-list-item value="">${t('unspecified')}</ha-list-item></ha-select>
        </div>
        <div class="hade-dialog-actions"><ha-button id="hade-dialog-confirm" unelevated>${t('create')}</ha-button></div>
    </div>

    <!-- 编辑 -->
    <div class="hade-dialog hade-dialog--edit" id="hade-edit-dialog" style="display:none;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h3 class="hade-dialog-title">${t('update_area')}</h3>
            <span class="hade-dialog-close" id="hade-edit-close"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></span>
        </div>
        <div class="hade-edit-section hade-edit-section--row"><div class="hade-edit-label">${t('area_id')}</div><div class="hade-edit-area-id" id="hade-edit-area-id"></div></div>
        <div class="hade-edit-section"><div class="hade-edit-label">${t('name')}</div><input type="text" class="hade-input" id="hade-edit-name" style="width:100%;"></div>
        <div class="hade-edit-section"><div class="hade-edit-label">${t('icon')}</div><ha-icon-picker id="hade-edit-icon-picker"></ha-icon-picker></div>
        <div class="hade-edit-section"><div class="hade-edit-label">${t('floor')}</div><ha-select id="hade-edit-floor-select" style="width:100%;"><ha-list-item value="">${t('unspecified')}</ha-list-item></ha-select></div>
        <div class="hade-dialog-actions hade-dialog-actions--edit"><ha-button id="hade-edit-delete" class="warning">${t('delete')}</ha-button><ha-button id="hade-edit-save" unelevated>${t('save')}</ha-button></div>
    </div>

    <!-- 分配实体/设备弹窗 (齿轮按钮) -->
    <div class="hade-dialog hade-dialog--assign" id="hade-assign-dialog" style="display:none;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <div class="hade-tabs"><span class="hade-tab active" data-tab="entity">${t('entities')}</span><span class="hade-tab" data-tab="device">${t('devices')}</span></div>
            <span class="hade-dialog-close" id="hade-assign-close"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></span>
        </div>
        <div class="hade-assign-title" id="hade-assign-title"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <span class="hade-assign-toggle" id="hade-assign-toggle">${t('select_all')}</span>
            <span style="font-size:12px;color:var(--secondary-text-color);" id="hade-assign-count"></span>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:12px;">
            <input type="text" class="hade-input" id="hade-assign-search" placeholder="${t('search')}" style="flex:1;">
            <select id="hade-assign-sort" class="hade-select" style="width:110px;height:40px;font-size:12px;"><option value="domain">${t('sort_by_type')}</option><option value="name">${t('sort_by_name')}</option><option value="area">${t('sort_by_area')}</option><option value="integration">${t('sort_by_integration')}</option></select>
        </div>
        <div class="hade-assign-list" id="hade-assign-list"></div>
        <div class="hade-dialog-actions"><ha-button id="hade-assign-save" unelevated>${t('save')}</ha-button></div>
    </div>

    <!-- 管理弹窗 (列表按钮) -->
    <div class="hade-dialog hade-dialog--manage" id="hade-manage-dialog" style="display:none;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 class="hade-dialog-title" id="hade-manage-title">${t('manage_title')}</h3>
            <span class="hade-dialog-close" id="hade-manage-close"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></span>
        </div>
        <div class="hade-assign-title" id="hade-manage-area-name"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <span class="hade-assign-toggle" id="hade-manage-toggle">${t('deselect_all')}</span>
            <span style="font-size:12px;color:var(--secondary-text-color);" id="hade-manage-count"></span>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:12px;">
            <input type="text" class="hade-input" id="hade-manage-search" placeholder="${t('search')}" style="flex:1;">
            <select id="hade-manage-sort" class="hade-select" style="width:110px;height:40px;font-size:12px;"><option value="domain">${t('sort_by_type')}</option><option value="name">${t('sort_by_name')}</option><option value="area">${t('sort_by_area')}</option><option value="integration">${t('sort_by_integration')}</option></select>
        </div>
        <div class="hade-assign-list" id="hade-manage-list"></div>
        <div class="hade-dialog-actions"><ha-button id="hade-manage-save" unelevated>${t('save')}</ha-button></div>
    </div>

</div>
        `;

        this._populateFloorSelect();
        this._bindEvents();
        }

        const container = this.querySelector('.hade-container');
        if (container) container.innerHTML = this._buildSections();
        const searchInput = this.querySelector('#hade-main-search');
        if (searchInput && document.activeElement !== searchInput && this._mainSearch) {
            searchInput.value = this._mainSearch;
        }
    }

    _buildSections() {
        const hass = this._hass;
        if (!hass) return '';
        const areas = Object.values(hass.areas);
        const floors = hass.floors ? Object.values(hass.floors) : [];
        const areasByFloor = {};
        const unassigned = [];
        areas.forEach((area) => {
            if (area.floor_id && floors.some((f) => f.floor_id === area.floor_id)) {
                (areasByFloor[area.floor_id] ||= []).push(area);
            } else {
                unassigned.push(area);
            }
        });
        let sections = '';
        const t = this._t.bind(this);
        const searchVal = (this._mainSearch || '').toLowerCase();
        const matchArea = (a) => !searchVal || (a.name || '').toLowerCase().includes(searchVal) || (a.area_id || '').toLowerCase().includes(searchVal);
        const entityCounts = {};
        Object.values(hass.entities || {}).forEach((entry) => {
            if (entry.area_id) entityCounts[entry.area_id] = (entityCounts[entry.area_id] || 0) + 1;
        });
        const filteredUnassigned = unassigned.filter(matchArea);
        if (searchVal) {
            if (filteredUnassigned.length) sections += this._floorSection(t('unassigned_floors'), filteredUnassigned, null, entityCounts);
            floors.forEach((floor) => {
                const fa = (areasByFloor[floor.floor_id] || []).filter(matchArea);
                if (fa.length) sections += this._floorSection(floor.name, fa, floor, entityCounts);
            });
            if (!sections) sections = '<div class="hade-empty">' + t('no_match') + '</div>';
        } else {
            if (unassigned.length) sections += this._floorSection(t('unassigned_floors'), unassigned, null, entityCounts);
            floors.forEach((floor) => {
                sections += this._floorSection(floor.name, areasByFloor[floor.floor_id] || [], floor, entityCounts);
            });
        }
        return sections;
    }

    _floorSection(title, areas, floorObj, entityCounts) {
        const t = this._t.bind(this);
        const isRealFloor = !!floorObj;
        const floorHeader = isRealFloor
            ? '<div class="hade-floor-header"><h2 class="hade-floor-title">' + title + '</h2><div class="hade-floor-menu" data-floor-id="' + floorObj.floor_id + '"><span class="hade-floor-menu-trigger" data-action="floor-menu-toggle"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 16a2 2 0 012 2 2 2 0 01-2 2 2 2 0 01-2-2c0-1.1.9-2 2-2m0-6a2 2 0 012 2c0 1.1-.89 2-2 2a2 2 0 01-2-2 2 2 0 012-2m0-6a2 2 0 012 2 2 2 0 01-2 2 2 2 0 01-2-2c0-1.11.89-2 2-2z"/></svg></span><div class="hade-floor-menu-dropdown"><div class="hade-floor-menu-item" data-action="floor-edit" data-floor-id="' + floorObj.floor_id + '">' + t('edit_floor') + '</div><div class="hade-floor-menu-item hade-floor-menu-item--danger" data-action="floor-delete" data-floor-id="' + floorObj.floor_id + '">' + t('delete_floor') + '</div></div></div></div>'
            : '<div class="hade-floor-header hade-floor-header--no-menu"><h2 class="hade-floor-title">' + title + '</h2></div>';
        if (!areas.length) {
            return '<div class="hade-floor">' + floorHeader + '<div class="hade-empty">' + t('no_areas') + '</div></div>';
        }
        const cards = areas.map((area) => {
            const count = entityCounts[area.area_id] || 0;
            const countStr = count > 0 ? '<div class="hade-card-count">' + t('entity_count', count) + '</div>' : '';
            const pic = area.picture
                ? '<div class="hade-card-pic" style="background-image:url(\'' + this._escAttr(area.picture) + '\')"></div>'
                : '<div class="hade-card-pic--placeholder"></div>';
            return `
                <ha-card outlined class="hade-card" data-area-id="${area.area_id}">
                    <div class="hade-card-actions" data-area-id="${area.area_id}">
                        <span class="hade-card-btn" data-action="manage" data-area-id="${area.area_id}" title="${t('manage_entity_device')}">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 4h4v4H3V4m6 1v2h12V5H9M3 10h4v4H3v-4m6 1v2h12v-2H9M3 16h4v4H3v-4m6 1v2h12v-2H9"/></svg>
                        </span>
                        <span class="hade-card-btn" data-action="assign" data-area-id="${area.area_id}" title="${t('add_entity_device')}">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 15.5A3.5 3.5 0 018.5 12 3.5 3.5 0 0112 8.5a3.5 3.5 0 013.5 3.5 3.5 3.5 0 01-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97s-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.4-1.06-.73-1.69-.98L14.5 2.42c-.04-.24-.25-.42-.5-.42h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.63c-.04.34-.07.67-.07 1s.03.66.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66z"/></svg>
                        </span>
                    </div>
                    ${pic}
                    <div class="hade-card-body">
                        <div>
                            <div class="hade-card-name">${area.name || area.area_id}</div>
                            ${countStr}
                        </div>
                        <span class="hade-pencil-btn" data-area-id="${area.area_id}">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20.71 7.04C21.1 6.65 21.1 6 20.71 5.63L18.37 3.29C18 2.9 17.35 2.9 16.96 3.29L15.12 5.12L18.87 8.87M3 17.25V21H6.75L17.81 9.93L14.06 6.18L3 17.25z"/></svg>
                        </span>
                    </div>
                </ha-card>`;
        }).join('');
        return '<div class="hade-floor">' + floorHeader + '<div class="hade-grid">' + cards + '</div></div>';
    }

    _populateFloorSelect() {
        const select = this.querySelector('#hade-edit-floor-select');
        if (!select || !this._hass) return;
        // 先保存当前值，重建选项后再恢复
        const targetVal = select.value;
        // 清空并重建默认选项
        while (select.firstChild) select.removeChild(select.firstChild);
        const defaultOpt = document.createElement('ha-list-item');
        defaultOpt.setAttribute('value', '');
        defaultOpt.textContent = this._t('unspecified');
        select.appendChild(defaultOpt);
        // 添加楼层选项
        const floors = this._hass.floors ? Object.values(this._hass.floors) : [];
        floors.forEach((floor) => {
            const name = floor.name || floor.floor_id;
            const opt = document.createElement('ha-list-item');
            opt.setAttribute('value', floor.floor_id);
            opt.textContent = name;
            select.appendChild(opt);
        });
        // 延迟一帧恢复值，等 MWC 扫描完子元素
        requestAnimationFrame(() => {
            const floors = this._hass.floors || {};
            select.value = (targetVal && floors[targetVal]) ? targetVal : '';
        });
    }

    /* ========== 列表构建 ========== */

    _listPrefix() {
        return this._manageMode === 'manage' ? 'hade-manage' : 'hade-assign';
    }

    _buildList() {
        const hass = this._hass;
        const area = this._editingArea;
        if (!hass || !area) return;
        const pre = this._listPrefix();

        const searchVal = (this.querySelector('#' + pre + '-search')?.value || '').toLowerCase();
        const sortBy = this.querySelector('#' + pre + '-sort')?.value || 'domain';

        let rows = [];
        if (this._manageMode === 'manage') {
            rows = this._buildCombinedRows(area, sortBy, searchVal);
        } else if (this._assignTab === 'entity') {
            rows = this._buildEntityRows(area, sortBy, searchVal);
        } else {
            rows = this._buildDeviceRows(area, sortBy, searchVal);
        }

        const listEl = this.querySelector('#' + pre + '-list');
        if (!listEl) return;

        if (!rows.length) {
            listEl.innerHTML = '<div style="padding:24px;text-align:center;color:var(--secondary-text-color);">' + this._t('no_match') + '</div>';
            this._updateListCount(pre);
            return;
        }

        listEl.innerHTML = rows.map((r) => `
            <div class="hade-assign-row" data-id="${r.id}" data-checked="${r.checked ? '1' : '0'}">
                <div class="hade-assign-checkbox${r.checked ? ' checked' : ''}"></div>
                <div class="hade-assign-info">
                    <div class="hade-assign-name">${r.name}</div>
                    <div class="hade-assign-sub">${r.sub}</div>
                </div>
                <span class="hade-assign-tag">${r.tag}</span>
            </div>
        `).join('');

        listEl.querySelectorAll('.hade-assign-row').forEach((row) => {
            row.addEventListener('click', () => {
                const cb = row.querySelector('.hade-assign-checkbox');
                const isChecked = cb.classList.contains('checked');
                if (isChecked) { cb.classList.remove('checked'); row.setAttribute('data-checked', '0'); }
                else { cb.classList.add('checked'); row.setAttribute('data-checked', '1'); }
                this._updateListCount(pre);
            });
        });

        this._updateListCount(pre);
    }

    _buildCombinedRows(area, sortBy, searchVal) {
        const hass = this._hass;
        const entityReg = hass.entities || {};
        const domainPriority = {
            'light':1,'switch':2,'climate':3,'cover':4,'fan':5,
            'sensor':6,'binary_sensor':7,'media_player':8,'camera':9,
            'lock':10,'vacuum':11,'automation':12,'script':13,'scene':14,
        };

        let rows = [];

        Object.keys(hass.states).forEach((entityId) => {
            const state = hass.states[entityId];
            const regEntry = entityReg[entityId];
            const entityArea = regEntry?.area_id || null;
            if (entityArea !== area.area_id) return;

            const domain = entityId.split('.')[0];
            rows.push({
                id: entityId,
                name: state.attributes?.friendly_name || entityId,
                sub: entityId,
                tag: domain,
                checked: true,
                domainOrder: domainPriority[domain] || 99,
            });
        });

        Object.values(hass.devices).forEach((device) => {
            if (device.area_id !== area.area_id) return;
            rows.push({
                id: device.id,
                name: device.name_by_user || device.name || device.id,
                sub: device.manufacturer || device.model || device.id,
                tag: this._t('device_tag'),
                checked: true,
                domainOrder: 100,
            });
        });

        if (searchVal) {
            rows = rows.filter((r) => r.name.toLowerCase().includes(searchVal) || r.id.toLowerCase().includes(searchVal));
        }

        if (sortBy === 'domain') {
            rows.sort((a, b) => a.domainOrder - b.domainOrder || a.name.localeCompare(b.name));
        } else if (sortBy === 'area') {
            rows.sort((a, b) => a.tag.localeCompare(b.tag) || a.name.localeCompare(b.name));
        } else {
            rows.sort((a, b) => a.name.localeCompare(b.name));
        }

        return rows;
    }

    _buildEntityRows(area, sortBy, searchVal) {
        const hass = this._hass;
        const entityReg = hass.entities || {};
        const domainPriority = {
            'light':1,'switch':2,'climate':3,'cover':4,'fan':5,
            'sensor':6,'binary_sensor':7,'media_player':8,'camera':9,
            'lock':10,'vacuum':11,'automation':12,'script':13,'scene':14,
        };
        const t = this._t.bind(this);

        let rows = Object.keys(hass.states).map((entityId) => {
            const state = hass.states[entityId];
            const domain = entityId.split('.')[0];
            const regEntry = entityReg[entityId];
            const entityArea = regEntry?.area_id || null;
            const platform = regEntry?.platform || domain;
            const name = state.attributes?.friendly_name || entityId;
            const areaName = entityArea ? (hass.areas[entityArea]?.name || entityArea) : t('unspecified_area');

            return {
                id: entityId, name, sub: entityId, tag: areaName,
                checked: entityArea === area.area_id, entityArea, domain, domainOrder: domainPriority[domain] || 99, platform,
            };
        });

        if (searchVal) {
            rows = rows.filter((r) => r.name.toLowerCase().includes(searchVal) || r.id.toLowerCase().includes(searchVal) || r.tag.toLowerCase().includes(searchVal));
        }

        if (sortBy === 'domain') {
            rows.sort((a, b) => a.domainOrder - b.domainOrder || a.name.localeCompare(b.name));
        } else if (sortBy === 'area') {
            rows.sort((a, b) => a.tag.localeCompare(b.tag) || a.name.localeCompare(b.name));
        } else if (sortBy === 'integration') {
            rows.sort((a, b) => a.platform.localeCompare(b.platform) || a.name.localeCompare(b.name));
        } else {
            rows.sort((a, b) => a.name.localeCompare(b.name));
        }
        return rows;
    }

    _buildDeviceRows(area, sortBy, searchVal) {
        const hass = this._hass;
        const t = this._t.bind(this);
        let rows = Object.values(hass.devices).map((device) => {
            const name = device.name_by_user || device.name || device.id;
            const sub = device.manufacturer || device.model || device.id;
            const deviceArea = device.area_id;
            const areaName = deviceArea ? (hass.areas[deviceArea]?.name || t('assigned')) : t('unassigned_dev');
            return { id: device.id, name, sub, tag: areaName, checked: deviceArea === area.area_id, deviceArea };
        });
        if (searchVal) {
            rows = rows.filter((r) => r.name.toLowerCase().includes(searchVal) || r.id.toLowerCase().includes(searchVal) || r.sub.toLowerCase().includes(searchVal));
        }
        if (sortBy === 'name' || sortBy === 'domain') {
            rows.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'area') {
            rows.sort((a, b) => a.tag.localeCompare(b.tag) || a.name.localeCompare(b.name));
        } else {
            rows.sort((a, b) => a.name.localeCompare(b.name));
        }
        return rows;
    }

    _updateListCount(pre) {
        const listEl = this.querySelector('#' + pre + '-list');
        const countEl = this.querySelector('#' + pre + '-count');
        if (!listEl || !countEl) return;
        const checked = listEl.querySelectorAll('[data-checked="1"]').length;
        const total = listEl.querySelectorAll('.hade-assign-row').length;
        countEl.textContent = checked + ' / ' + total + ' ' + this._t('selected_count');
    }

    /* ========== 事件绑定 ========== */

    _bindEvents() {
        const self = this;
        const t = this._t.bind(this);
        const overlay = this.querySelector('#hade-dialog-overlay');
        const createDialog = this.querySelector('#hade-create-dialog');
        const editDialog = this.querySelector('#hade-edit-dialog');
        const assignDialog = this.querySelector('#hade-assign-dialog');
        const manageDialog = this.querySelector('#hade-manage-dialog');

        const closeAll = () => {
            overlay.classList.remove('open');
            this._editingArea = null;
            this._pendingType = '';
        };

        const hideDialogs = () => {
            createDialog.style.display = 'none';
            editDialog.style.display = 'none';
            assignDialog.style.display = 'none';
            manageDialog.style.display = 'none';
        };

        // ===== 创建 =====
        const createTitleEl = this.querySelector('#hade-dialog-title');
        const createInputEl = this.querySelector('#hade-dialog-input');
        const openCreate = (type) => {
            this._pendingType = type;
            createTitleEl.textContent = type === 'floor' ? t('create_floor') : t('create_area');
            createInputEl.value = '';
            const floorWrap = this.querySelector('#hade-create-floor-wrap');
            if (type === 'area') {
                floorWrap.style.display = '';
                const floorSelect = this.querySelector('#hade-create-floor-select');
                if (floorSelect) {
                    while (floorSelect.firstChild) floorSelect.removeChild(floorSelect.firstChild);
                    const defaultOpt = document.createElement('ha-list-item');
                    defaultOpt.setAttribute('value', '');
                    defaultOpt.textContent = t('unspecified');
                    floorSelect.appendChild(defaultOpt);
                    (this._hass.floors ? Object.values(this._hass.floors) : []).forEach((floor) => {
                        const name = floor.name || floor.floor_id;
                        const opt = document.createElement('ha-list-item');
                        opt.setAttribute('value', floor.floor_id);
                        opt.textContent = name;
                        floorSelect.appendChild(opt);
                    });
                }
            } else {
                floorWrap.style.display = 'none';
            }
            hideDialogs(); createDialog.style.display = '';
            overlay.classList.add('open');
            setTimeout(() => createInputEl.focus(), 100);
        };
        const doCreate = async () => {
            const name = createInputEl.value.trim();
            if (!name || !this._hass) return;
            try {
                if (this._pendingType === 'floor') {
                    await this._hass.callWS({ type: 'config/floor_registry/create', name });
                } else {
                    const floorSelect = this.querySelector('#hade-create-floor-select');
                    const floorId = floorSelect ? floorSelect.value || null : null;
                    await this._hass.callWS({ type: 'config/area_registry/create', name, floor_id: floorId || undefined });
                }
            } catch (e) {}
            closeAll();
        };

        // ===== 编辑 =====
        const openEdit = (areaId) => {
            const area = this._hass.areas[areaId];
            if (!area) return;
            this._editingArea = area;
            this.querySelector('#hade-edit-area-id').textContent = area.area_id;
            this.querySelector('#hade-edit-name').value = area.name || '';
            const iconPicker = this.querySelector('#hade-edit-icon-picker');
            if (iconPicker) iconPicker.value = area.icon || '';
            const floorSelect = this.querySelector('#hade-edit-floor-select');
            this._populateFloorSelect();
            if (floorSelect) {
                requestAnimationFrame(() => {
                    const floorId = area.floor_id || '';
                    const floors = this._hass.floors || {};
                    floorSelect.value = (floorId && floors[floorId]) ? floorId : '';
                });
            }
            hideDialogs(); editDialog.style.display = '';
            overlay.classList.add('open');
        };
        const doSaveEdit = async () => {
            const area = this._editingArea;
            if (!area || !this._hass) return;
            const floorSelect = this.querySelector('#hade-edit-floor-select');
            const iconPicker = this.querySelector('#hade-edit-icon-picker');
            try {
                await this._hass.callWS({
                    type: 'config/area_registry/update', area_id: area.area_id,
                    name: this.querySelector('#hade-edit-name').value.trim() || area.name,
                    icon: (iconPicker && iconPicker.value) ? iconPicker.value.trim() || null : area.icon,
                    floor_id: (floorSelect && floorSelect.value) ? floorSelect.value || null : area.floor_id,
                });
            } catch (e) {}
            closeAll();
        };
        const doDelete = async () => {
            const area = this._editingArea;
            if (!area) return;
            if (!confirm(t('confirm_delete', area.name || area.area_id))) return;
            try { await this._hass.callWS({ type: 'config/area_registry/delete', area_id: area.area_id }); } catch (e) {}
            closeAll();
        };

        // ===== 分配弹窗 (齿轮) =====
        const openAssign = (areaId) => {
            const area = this._hass.areas[areaId];
            if (!area) return;
            this._editingArea = area;
            this._manageMode = 'assign';
            this._assignTab = 'entity';
            this.querySelectorAll('.hade-tab').forEach((tab) => tab.classList.remove('active'));
            const entityTab = this.querySelector('.hade-tab[data-tab="entity"]');
            if (entityTab) entityTab.classList.add('active');
            const searchEl = this.querySelector('#hade-assign-search');
            if (searchEl) searchEl.value = '';
            const sortEl = this.querySelector('#hade-assign-sort');
            if (sortEl) sortEl.value = 'domain';
            this.querySelector('#hade-assign-title').textContent = t('add_to_title') + (area.name || area.area_id);
            hideDialogs(); assignDialog.style.display = '';
            overlay.classList.add('open');
            this._buildList();
        };
        const doSaveAssign = async () => {
            const area = this._editingArea;
            if (!area || !this._hass) return;
            const hass = this._hass;
            const listEl = this.querySelector('#hade-assign-list');
            const rows = listEl ? listEl.querySelectorAll('.hade-assign-row') : [];
            const promises = [];
            rows.forEach((row) => {
                const id = row.getAttribute('data-id');
                const checked = row.getAttribute('data-checked') === '1';
                const tab = this._assignTab;

                let wasChecked = false;
                if (tab === 'entity') {
                    wasChecked = (hass.entities?.[id]?.area_id === area.area_id);
                } else {
                    wasChecked = (hass.devices[id]?.area_id === area.area_id);
                }
                if (checked === wasChecked) return;

                const targetArea = checked ? area.area_id : null;
                if (tab === 'entity') {
                    promises.push(hass.callWS({ type: 'config/entity_registry/update', entity_id: id, area_id: targetArea }));
                } else {
                    promises.push(hass.callWS({ type: 'config/device_registry/update', device_id: id, area_id: targetArea }));
                }
            });
            try { await Promise.all(promises); } catch (e) {}
            closeAll();
        };

        // ===== 管理弹窗 (列表) =====
        const openManage = (areaId) => {
            const area = this._hass.areas[areaId];
            if (!area) return;
            this._editingArea = area;
            this._manageMode = 'manage';
            const searchEl = this.querySelector('#hade-manage-search');
            if (searchEl) searchEl.value = '';
            const sortEl = this.querySelector('#hade-manage-sort');
            if (sortEl) sortEl.value = 'domain';
            this.querySelector('#hade-manage-title').textContent = t('manage_added');
            this.querySelector('#hade-manage-area-name').textContent = area.name || area.area_id;
            hideDialogs(); manageDialog.style.display = '';
            overlay.classList.add('open');
            this._buildList();
            const toggleEl = this.querySelector('#hade-manage-toggle');
            if (toggleEl) toggleEl.textContent = t('deselect_all');
        };
        const doSaveManage = async () => {
            const area = this._editingArea;
            if (!area || !this._hass) return;
            const hass = this._hass;
            const listEl = this.querySelector('#hade-manage-list');
            const rows = listEl ? listEl.querySelectorAll('.hade-assign-row') : [];
            const promises = [];
            rows.forEach((row) => {
                const id = row.getAttribute('data-id');
                const checked = row.getAttribute('data-checked') === '1';
                if (checked) return;
                if (id.includes('.')) {
                    promises.push(hass.callWS({ type: 'config/entity_registry/update', entity_id: id, area_id: null }));
                } else {
                    promises.push(hass.callWS({ type: 'config/device_registry/update', device_id: id, area_id: null }));
                }
            });
            try { await Promise.all(promises); } catch (e) {}
            closeAll();
        };

        // ===== FAB =====
        this.querySelector('#hade-create-area')?.addEventListener('click', () => openCreate('area'));
        this.querySelector('#hade-create-floor')?.addEventListener('click', () => openCreate('floor'));
        this.querySelectorAll('.hade-header ha-icon-button').forEach((btn) => {
            const label = btn.getAttribute('label');
            btn.addEventListener('click', () => {
                if (label === t('create_floor')) openCreate('floor');
                if (label === t('create_area')) openCreate('area');
            });
        });

        // 创建弹窗
        this.querySelector('#hade-dialog-confirm')?.addEventListener('click', doCreate);
        this.querySelector('#hade-create-close')?.addEventListener('click', closeAll);
        createInputEl?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doCreate(); if (e.key === 'Escape') closeAll(); });

        // 编辑弹窗
        this.querySelector('#hade-edit-save')?.addEventListener('click', doSaveEdit);
        const deleteBtn = this.querySelector('#hade-edit-delete');
        if (deleteBtn) {
            deleteBtn.danger = true;
            deleteBtn.addEventListener('click', doDelete);
        }
        this.querySelector('#hade-edit-close')?.addEventListener('click', closeAll);

        // 楼层菜单（每次 render 后直接绑定，不需要 constructor 的 document 委托）
        this.querySelectorAll('.hade-floor-menu-trigger').forEach((trigger) => {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = trigger.parentElement.querySelector('.hade-floor-menu-dropdown');
                if (dropdown) {
                    const wasOpen = dropdown.classList.contains('open');
                    this.querySelectorAll('.hade-floor-menu-dropdown.open').forEach((dd) => dd.classList.remove('open'));
                    if (!wasOpen) dropdown.classList.add('open');
                }
            });
        });
        this.querySelectorAll('[data-action="floor-edit"]').forEach((item) => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const floorId = item.getAttribute('data-floor-id');
                if (floorId) this._floorAction('edit', floorId);
            });
        });
        this.querySelectorAll('[data-action="floor-delete"]').forEach((item) => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const floorId = item.getAttribute('data-floor-id');
                if (floorId) this._floorAction('delete', floorId);
            });
        });

        // 分配弹窗
        this.querySelector('#hade-assign-close')?.addEventListener('click', closeAll);
        this.querySelector('#hade-assign-save')?.addEventListener('click', doSaveAssign);

        this.querySelector('#hade-assign-toggle')?.addEventListener('click', () => this._toggleAll('hade-assign'));

        this.querySelectorAll('#hade-assign-dialog .hade-tab').forEach((tab) => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                this._assignTab = tabName;
                this.querySelectorAll('#hade-assign-dialog .hade-tab').forEach((t2) => t2.classList.remove('active'));
                tab.classList.add('active');
                const sortEl = this.querySelector('#hade-assign-sort');
                if (sortEl) sortEl.value = tabName === 'entity' ? 'domain' : 'name';
                this._buildList();
                const toggleEl = this.querySelector('#hade-assign-toggle');
                if (toggleEl) toggleEl.textContent = t('select_all');
            });
        });

        this.querySelector('#hade-assign-search')?.addEventListener('input', () => this._buildList());
        this.querySelector('#hade-assign-sort')?.addEventListener('change', () => this._buildList());

        // 管理弹窗
        this.querySelector('#hade-manage-close')?.addEventListener('click', closeAll);
        this.querySelector('#hade-manage-save')?.addEventListener('click', doSaveManage);
        this.querySelector('#hade-manage-toggle')?.addEventListener('click', () => this._toggleAll('hade-manage'));
        this.querySelector('#hade-manage-search')?.addEventListener('input', () => this._buildList());
        this.querySelector('#hade-manage-sort')?.addEventListener('change', () => this._buildList());

        this.querySelector('#hade-main-search')?.addEventListener('input', (e) => {
            this._mainSearch = e.target.value || '';
            const container = this.querySelector('.hade-container');
            if (container) container.innerHTML = this._buildSections();
        });

        overlay?.addEventListener('click', (e) => { if (e.target === overlay) closeAll(); });

        // ===== 卡片点击（容器事件委托，搜索刷新内容后无需重新绑定）
        const cardContainer = this.querySelector('.hade-container');
        if (cardContainer) {
            cardContainer.addEventListener('click', (e) => {
                const pencil = e.target.closest('.hade-pencil-btn');
                const btn = e.target.closest('.hade-card-btn');
                const card = e.target.closest('.hade-card');
                if (pencil) {
                    e.stopPropagation();
                    const areaId = pencil.getAttribute('data-area-id');
                    if (areaId) openEdit(areaId);
                    return;
                }
                if (btn) {
                    e.stopPropagation();
                    const action = btn.getAttribute('data-action');
                    const areaId = btn.getAttribute('data-area-id');
                    if (action === 'assign' && areaId) openAssign(areaId);
                    else if (action === 'manage' && areaId) openManage(areaId);
                    return;
                }
                if (card) {
                    const areaId = card.getAttribute('data-area-id');
                    if (areaId) {
                        history.pushState(null, '', '/config/areas/area/' + areaId);
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    }
                }
            });
        }
    }

    _toggleAll(pre) {
        const listEl = this.querySelector('#' + pre + '-list');
        const rows = listEl ? listEl.querySelectorAll('.hade-assign-row') : [];
        const allChecked = Array.from(rows).every((r) => r.getAttribute('data-checked') === '1');
        rows.forEach((row) => {
            const cb = row.querySelector('.hade-assign-checkbox');
            if (allChecked) { cb.classList.remove('checked'); row.setAttribute('data-checked', '0'); }
            else { cb.classList.add('checked'); row.setAttribute('data-checked', '1'); }
        });
        const toggleEl = this.querySelector('#' + pre + '-toggle');
        if (toggleEl) toggleEl.textContent = allChecked ? this._t('select_all') : this._t('deselect_all');
        this._updateListCount(pre);
    }

    async _floorAction(action, floorId) {
        const floor = this._hass && this._hass.floors ? this._hass.floors[floorId] : null;
        if (!floor) return;
        if (action === 'edit') {
            const newName = prompt(this._t('edit_floor_name') + ':', floor.name || '');
            if (newName && newName.trim() && newName.trim() !== floor.name) {
                try { await this._hass.callWS({ type: 'config/floor_registry/update', floor_id: floorId, name: newName.trim() }); } catch (e) {}
            }
        } else if (action === 'delete') {
            if (!confirm(this._t('confirm_delete_floor', floor.name || floorId))) return;
            try { await this._hass.callWS({ type: 'config/floor_registry/delete', floor_id: floorId }); } catch (e) {}
        }
        this.querySelectorAll('.hade-floor-menu-dropdown.open').forEach((dd) => dd.classList.remove('open'));
    }

    _escAttr(str) { return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

    updateDeviceArea(hass, deviceId, newAreaId) {
        hass.callService('huian_areas', 'update_device', { device_id: deviceId, area_id: newAreaId });
    }

    updateEntityArea(hass, entityId, newAreaId) {
        hass.callService('huian_areas', 'update_entity', { entity_id: entityId, area_id: newAreaId });
    }
}

customElements.define('ha-panel-huian-areas', HaDataEditorPanel);