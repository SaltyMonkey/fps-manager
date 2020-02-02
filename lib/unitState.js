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
const equal = require("fast-deep-equal");
const rfdc = require("rfdc")({ "proto": true });
const EventEmitter = require("events").EventEmitter;
const utils = require("./helpers/utils");

//import enums 
const { RAW_HOOK_MODE, HOOK_SETTINGS, ABN, EVENTS } = require("./helpers/enums");

//types for abnormals to find in client data
const huntingRewards = [ABN.HuntingGoldModifier, ABN.QuestingGoldModifier, ABN.ReputationBoostModifier, ABN.EPExp];
const shapeChangers = [ABN.BigHead, ABN.ShapeChanger];
const onScreenEffects = [ABN.FX, ABN.PostProcessingEffect];

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
		this.__fps = deps.fps;
		
		Object.assign(this, {
			//main properties for state management
			"settings": {}, //mod settings
			"presets": {}, // all loaded per class presets
			"preset": {}, //current chosen preset
			"activeMode": undefined,
			"prevMode": undefined,
			"availableClasses": ["common"],
			"userTemplateToClassMap": {},
			"lockedPacketsData": [],
			"throttlePacketsData": [],
			//lookup structures 
			"huntingRewardsBuffs": new Set(),
			"shapeChangersBuffs": new Set(),
			"onScreenEffectsBuffs": new Set(),
			"smtsSet": new Set()
		});

		deps.mod.game.data.abnormalities.forEach(abnormality => {
			let types = abnormality.effects.map(x => x.type);
			if (utils.arraysHasIntersect(types, huntingRewards)) {
				this.huntingRewardsBuffs.add(abnormality.id);
			}
			if (utils.arraysHasIntersect(types, shapeChangers)) {
				this.shapeChangersBuffs.add(abnormality.id);
			}
			if (utils.arraysHasIntersect(types, onScreenEffects)) {
				this.onScreenEffectsBuffs.add(abnormality.id);
			}
		});

		deps.mod.game.data.users.forEach(template => {
			this.availableClasses.push(template.class);
			this.userTemplateToClassMap[template] = template.class;
		});

		this.Init();
	}

	Init() {
		this.settings = utils.loadJson(utils.getFullPath(__dirname, "../settings/settings.json"));
		if (!this.settings) throw new Error("Settings file can't be loaded! Critical error. ");

		this.availableClasses.forEach(x => {
			this.presets[x] = utils.loadJson(utils.getFullPath(__dirname, `../settings/presets/${x}.json`));
		});

		let staticData = utils.loadJson(utils.getFullPath(__dirname, "../data/staticData.json"));

		this.lockedPacketsData = staticData.BlockedProto;
		this.throttlePacketsData = staticData.throttledProto;
		this.smtsSet = new Set(...staticData.blockedSmt);

		this.__mod.hook("S_LOGIN", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.FIRST, this._loginEvent);
		this.__mod.hook(...this.__proto.getData("S_LOAD_TOPO"), HOOK_SETTINGS.FIRST, this._areaTriggerCheck);
		this.__mod.hook("S_FIELD_EVENT_ON_ENTER", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.FIRST, this._guardianTriggerCheck);
		this.__mod.hook("S_FIELD_EVENT_ON_LEAVE", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.FIRST, this._guardianLeaveTriggerCheck);
	}

	//exposed handler for debug purposes 
	_loginEvent() {
		this.preset = this.settings["classBasedPresets"]
			? (this.presets[this.__mod.game.me.class] || this.presets["common"])
			: this.presets["common"];

		if (!this.preset) { throw new Error("Preset can't be loaded! Critical error. "); }

		this.activeMode = this.preset[this.preset.directives["default"]];
	}

	//exposed handler for debug purposes 
	_areaTriggerCheck(event) {
		if (!this.settings["applyTrigger"] || equal(this.prevMode, this.activeMode)) return;
		this.prevMode = rfdc(this.activeMode);
		if (this.__mod.game.me.inOpenWorld && this.preset.directives.triggerOW) {
			this.activeMode = this.preset[this.preset.directives.triggerOW];
		}
		else if (this.__mod.game.me.inBattleground && this.preset.directives.triggerBG) {
			this.activeMode = this.preset[this.preset.directives.triggerBG];
		}
		else if (this.__mod.game.me.inCivilUnrest && this.preset.directives.triggerCU) {
			this.activeMode = this.preset[this.preset.directives.triggerCU];
		}
		else if (this.__mod.game.me.inDungeon && this.preset.directives.triggerDungeons) {
			this.activeMode = this.preset[this.preset.directives.triggerDungeons[event.zone]] || 
							this.preset[this.preset.directives.triggerDungeons["all"]];
		}
	}

	//exposed handler for debug purposes 
	_guardianTriggerCheck() {
		if (!this.settings["applyTrigger"] || equal(this.prevMode, this.activeMode)) return;
		this.prevMode = rfdc(this.activeMode);
		this.activeMode = this.preset[this.preset.directives.triggerGuardians];
		this._eventTrigger();
	}

	//exposed handler for debug purposes 
	_guardianLeaveTriggerCheck() {
		if (!this.settings["applyTrigger"] || equal(this.prevMode, this.activeMode)) return;
		this.activeMode = rfdc(this.prevMode);
		this._eventTrigger();
	}

	_eventTrigger() {
		this.emit(EVENTS.RECONFIGURE, this.prevMode, this.activeMode);
	}
}

module.exports = unitState;