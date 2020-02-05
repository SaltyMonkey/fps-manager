"use strict";

/*
* Unit for Fps Manager. Managing module state and events
* Author: SaltyMonkey
* Contributors: 
*/

/**
 * @typedef {import("../fpsManager.js").deps} deps
*/
const assert = require("assert").strict;
//using es5 compatible mode because json not supports es6 types and es6 version is slow ->(require("fast-deep-equal/es6");)
const equal = require("fast-deep-equal");
const EventEmitter = require("events").EventEmitter;

const rfdc = require("rfdc")({ "proto": true });
const utils = require("./helpers/utils");
//const watchdog = require("./helpers/watchdog");

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

		assert.ok(Object.keys(deps), "unitState: empty deps");

		console.log("DEBUG: unitState -> constructor");

		this.__mod = deps.mod;
		this.__proto = deps.proto;
		this.__fps = deps.fps;

		Object.assign(this, {
			//main properties for state management
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
			"smtData": new Set()
		});

		deps.mod.game.data.abnormalities.forEach(abnormality => {
			let types = abnormality.effects.map(x => x.type);
			if (utils.arraysHasIntersect(types, huntingRewards))
				this.huntingRewardsBuffs.add(abnormality.id);
			if (utils.arraysHasIntersect(types, shapeChangers))
				this.shapeChangersBuffs.add(abnormality.id);
			if (utils.arraysHasIntersect(types, onScreenEffects))
				this.onScreenEffectsBuffs.add(abnormality.id);
		});

		assert.ok(Array.from(this.huntingRewardsBuffs).length > 0, "unitState: empty huntingRewardsBuffs");
		assert.ok(Array.from(this.shapeChangersBuffs).length > 0, "unitState: empty shapeChangersBuffs");
		assert.ok(Array.from(this.onScreenEffectsBuffs).length > 0, "unitState: empty onScreenEffectsBuffs");

		deps.mod.game.data.users.forEach(template => {
			this.availableClasses.push(template.class);
			this.userTemplateToClassMap[template] = template.class;
		});

		assert.ok(this.availableClasses.length > 0, "unitState: empty availableClasses");
		assert.ok(Object.keys(this.userTemplateToClassMap).length > 0, "unitState: empty userTemplateToClassMap");
		
		this.Init();
	}

	Init() {
		console.log("DEBUG: unitState -> Init");

		this.availableClasses.forEach(x => {
			this.presets[x] = utils.loadJson(utils.getFullPath(__dirname, `../settings/presets/${x}.json`));
		});

		assert.ok(Object.keys(this.presets).length >= 1, "unitState: empty presets");

		let staticData = utils.loadJson(utils.getFullPath(__dirname, "../data/staticData.json"));

		assert.ok(Object.keys(staticData).length > 0, "unitState: empty staticData");

		this.lockedPacketsData = staticData.blockedProto;
		this.throttlePacketsData = staticData.throttledProto;
		this.smtData = new Set(...staticData.blockedSmt);

		this.__mod.hook("S_LOGIN", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.FIRST, () => {
			this.preset = this.__mod.settings["classBasedPresets"]
				? (this.presets[this.__mod.game.me.class] || this.presets["common"])
				: this.presets["common"];

			if (!this.preset) { throw new Error("Preset can't be loaded! Critical error. "); }

			this.activeMode = this.preset.modes[this.preset.directives["default"]];
			assert.ok(Object.keys(this.activeMode).length > 0, "unitState: empty activeMode");
		});

		this.__mod.hook(...this.__proto.getData("S_LOAD_TOPO"), HOOK_SETTINGS.FIRST, (event) => {
			if (!this.__mod.settings["enableEvents"] || equal(this.prevMode, this.activeMode)) return;

			this.prevMode = rfdc(this.activeMode);

			if (this.__mod.game.me.inOpenWorld && this.preset.directives.triggerOW) {
				this.activeMode = this.preset.modes[this.preset.directives.triggerOW];
			}
			else if (this.__mod.game.me.inBattleground && this.preset.directives.triggerBG) {
				this.activeMode = this.preset.modes[this.preset.directives.triggerBG];
			}
			else if (this.__mod.game.me.inCivilUnrest && this.preset.directives.triggerCU) {
				this.activeMode = this.preset.modes[this.preset.directives.triggerCU];
			}
			else if (this.__mod.game.me.inDungeon && this.preset.directives.triggerDungeons) {
				this.activeMode = this.preset.modes[this.preset.directives.triggerDungeons[event.zone]] ||
					this.preset.modes[this.preset.directives.triggerDungeons["all"]];
			}
		});

		this.__mod.hook("S_FIELD_EVENT_ON_ENTER", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.FIRST, () => {
			if (!this.__mod.settings["enableEvents"] || equal(this.prevMode, this.activeMode)) return;

			this.prevMode = rfdc(this.activeMode);

			this.activeMode = this.preset.modes[this.preset.directives.triggerGuardians];
			this._eventTrigger();
		});

		this.__mod.hook("S_FIELD_EVENT_ON_LEAVE", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.FIRST, () => {
			if (!this.__mod.settings["enableEvents"] || equal(this.prevMode, this.activeMode)) return;

			this.activeMode = rfdc(this.prevMode);

			this._eventTrigger();
		});
	}

	_eventTrigger() {
		console.log("DEBUG: unitState -> _eventTrigger");
		this.emit(EVENTS.RECONFIGURE);
	}
}

module.exports = unitState;