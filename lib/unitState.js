"use strict";

/*
* Unit for Fps Manager. Managing module state and events
* Author: SaltyMonkey
* Contributors: 
*/

/**
 * @typedef {import("../fpsManager.js").deps} deps
*/

//using es5 compatible mode because json not supports es6 types and es6 version is slow ->(require("fast-deep-equal/es6");)
const EventEmitter = require("events").EventEmitter;

const rfdc = require("rfdc")({ "proto": true });
const utils = require("./helpers/utils");
//const watchdog = require("./helpers/watchdog");

//import enums 
const { RAW_HOOK_MODE, HOOK_SETTINGS, ABN, EVENTS } = require("./helpers/enums");

//types for abnormals to find in client data
const shapeChangers = [ABN.BigHead, ABN.ShapeChanger];
const onScreenEffects = [ABN.FX, ABN.PostProcessingEffect];
const ccbEffects = [ABN.CCB];

class unitState extends EventEmitter {
	/**
	 *Creates an instance of unitState.
	 * @param {deps} deps dependencies
	 * @memberof unitState
	 */
	constructor(deps) {
		super();

		this.__mod = deps.mod;
		this.__proto = deps.proto;
		this.__log = deps.log;

		Object.assign(this, {
			//main properties for state management
			"presets": {}, // all loaded per class presets
			"preset": {}, //current chosen preset
			"activeMode": undefined,
			"prevMode": undefined,
			"lockedMode": false,
			"inGame": false,
			"externalShakeControl": false,
			"availableClasses": new Set(),
			"userTemplateToClassMap": {},
			"lockedPacketsData": [],
			"throttlePacketsData": [],
			//lookup structures 
			"shapeChangersBuffs": new Set(),
			"onScreenEffectsBuffs": new Set(),
			"ccbBuffs": new Set(),
			"smtData": new Set(),
			"specialAs": new Set(),
			"whitelistAbnormals": new Set(),
			"whitelistProjectiles": new Set()
		});

		deps.mod.game.data.abnormalities.forEach(abnormality => {
			let types = abnormality.effects.map(x => x.type);
			if (utils.arraysHasIntersect(types, shapeChangers))
				this.shapeChangersBuffs.add(abnormality.id);
			if (utils.arraysHasIntersect(types, onScreenEffects))
				this.onScreenEffectsBuffs.add(abnormality.id);
			if (utils.arraysHasIntersect(types, ccbEffects))
				this.ccbBuffs.add(abnormality.id);
		});

		this.__mod.queryData("/S1ActionScripts@type=?/Script/", ["Teleport"], true, false, ["id"]).then(result => {
			let res = result.map(rs => rs.attributes.id);
			res.forEach(x => { this.specialAs.add(x); });
		});

		this.availableClasses.add("common");
		deps.mod.game.data.users.forEach(template => {
			this.availableClasses.add(template.class);
			this.userTemplateToClassMap[template.id] = template.class;
		});

		this.Init();
	}

	Init() {
		([...this.availableClasses]).forEach(x => {
			this.presets[x] = utils.loadJson(utils.getFullPath(__dirname, `../settings/presets/${x}.json`));
		});
		let staticData = utils.loadJson(utils.getFullPath(__dirname, "../data/staticData.json"));

		this.lockedPacketsData = staticData.blockedProto;
		this.throttlePacketsData = staticData.throttledProto;
		this.smtData = new Set(staticData.blockedSmt);
		this.whitelistAbnormals = new Set(staticData.excludedAbnormals);
		this.whitelistProjectiles = new Set(staticData.excludedProjectiles);

		this.__mod.hook("S_LOGIN", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.FIRST, () => {
			this.lockedMode = false;

			if(this.__mod.manager.isLoaded("camera-control")) {
				this.__mod.log("Camera shake effects will not be applied as the Shaker mod is installed. Please use \"/toolbox shaker\" to configure camera shaking behavior");
				this.externalShakeControl = true;
			}

			this.preset = this.__mod.settings.classBasedPresets
				? (this.presets[this.__mod.game.me.class] || this.presets["common"])
				: this.presets["common"];
			if (!this.preset) { throw new Error("Preset can't be loaded! Critical error. "); }

			this.activeMode = this.preset.modes[this.preset.directives["default"]];

			if (this.__mod.settings.interactive) this.__log.send(`Default mode: "${this.preset.directives["default"]}".`);
		
			this.inGame = true;
			this._eventTriggerPartial();
		});

		this.__mod.hook(...this.__proto.getData("S_LOAD_TOPO"), (event) => {
			if (!this.__mod.settings.enableEvents || this.lockedMode) return;
			this.prevMode = rfdc(this.activeMode);
			if (this.__mod.game.me.inBattleground && this.preset.directives.triggerBG) {
				this.activeMode = this.preset.modes[this.preset.directives.triggerBG];

				if (this.__mod.settings.interactive) this.__log.send(`Mode was changed to "${this.preset.directives.triggerBG}".`);
			}
			else if (this.__mod.game.me.inCivilUnrest && this.preset.directives.triggerCU) {
				this.activeMode = this.preset.modes[this.preset.directives.triggerCU];

				if (this.__mod.settings.interactive) this.__log.send(`Mode was changed to "${this.preset.directives.triggerCU}".`);
			}
			else if (this.__mod.game.me.inDungeon && this.preset.directives.triggerDungeons) {
				let mode = undefined;
				let name = undefined;

				if (this.preset.modes[this.preset.directives.triggerDungeons[event.zone]]) {
					name = this.preset.directives.triggerDungeons[event.zone];
					mode = this.preset.modes[this.preset.directives.triggerDungeons[event.zone]];
				}
				else if (this.preset.modes[this.preset.directives.triggerDungeons["all"]]) {
					name = this.preset.directives.triggerDungeons["all"];
					mode = this.preset.modes[this.preset.directives.triggerDungeons["all"]];
				}

				if (mode) {
					this.activeMode = mode;
					if (this.__mod.settings.interactive) this.__log.send(`Mode was changed to ${name}`);
				}
			}
			else if (this.__mod.game.me.inOpenWorld && this.preset.directives.triggerOW) {
				this.activeMode = this.preset.modes[this.preset.directives.triggerOW];
				if (this.__mod.settings.interactive) this.__log.send(`Mode was changed to "${this.preset.directives.triggerOW}".`);
			}

			this._eventTriggerPartial();
		});

		this.__mod.hook("S_FIELD_EVENT_ON_ENTER", RAW_HOOK_MODE.EVENT, () => {
			if (!this.__mod.settings.enableEvents) return;
			this.prevMode = rfdc(this.activeMode);
			this.lockedMode = true;

			this.activeMode = this.preset.modes[this.preset.directives.triggerGuardians];

			if (this.__mod.settings.interactive) this.__log.send(`Mode was changed to "${this.preset.directives.triggerGuardians}".`);

			this._eventTrigger();
		});

		this.__mod.hook("S_FIELD_EVENT_ON_LEAVE", RAW_HOOK_MODE.EVENT, () => {
			if (!this.__mod.settings.enableEvents) return;
			this.activeMode = rfdc(this.prevMode);
			this.lockedMode = false;

			if (this.__mod.settings.interactive) this.__log.send("Mode was changed back");

			this._eventTrigger();
		});

		this.__mod.hook("S_RETURN_TO_LOBBY", RAW_HOOK_MODE.EVENT, () => {
			this.inGame = false;
		});
	}

	_eventTrigger() {
		this.emit(EVENTS.RECONFIGURE);
	}

	_eventTriggerPartial() {
		this.emit(EVENTS.RECONFIGUREPARTIAL);
	}
}

module.exports = unitState;