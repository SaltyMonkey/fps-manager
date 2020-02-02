"use strict";

/*
* Unit for Fps Manager. Tracking original data from server
* Author: SaltyMonkey
* Contributors: 
*/

/**
 * @typedef {import("../fpsManager.js").deps} deps
*/

const { ENTITY_HOOK_TYPE, HOOK_SETTINGS, RAW_HOOK_MODE, SPECIAL_ZONES } = require("./helpers/enums");

class unitTracker {
	/**
	 *Creates an instance of unitState.
	 * @param {deps} deps dependencies
	 * @memberof unitTracker
	 */
	constructor(deps) {
		const mod = deps.mod;
		const proto = deps.proto;
		
		console.log("DEBUG: unitTracker -> constructor");
		
		// portals "shapeId": 652992,
		// ninja log "shapeId": 303030
		// sentinel "shapeId": 730500

		Object.assign(this, {
			"collections": new Map(),
			"drop": new Map(),
			"servants": new Map(),
			"users": new Map(),
			"npcs": new Map(),
			"summons": new Map()
		});

		const dropHandler = (type, event) => {
			switch (type) {
				case (ENTITY_HOOK_TYPE.DESPAWN): this.drop.delete(event.gameId); break;
				case (ENTITY_HOOK_TYPE.SPAWN): this.drop.set(event.gameId, event); break;
			}
		};

		const collectionHandler = (type, event) => {
			switch (type) {
				case (ENTITY_HOOK_TYPE.DESPAWN): this.collections.delete(event.gameId); break;
				case (ENTITY_HOOK_TYPE.SPAWN): this.collections.set(event.gameId, event); break;
			}
		};

		const servantsHandler = (type, event) => {
			switch (type) {
				case (ENTITY_HOOK_TYPE.DESPAWN): this.servants.delete(event.gameId); break;
				case (ENTITY_HOOK_TYPE.SPAWN): this.servants.set(event.gameId, event); break;
			}
		};

		const userHandler = (type, event) => {
			switch (type) {
				case (ENTITY_HOOK_TYPE.DESPAWN): this.users.delete(event.gameId); break;
				case (ENTITY_HOOK_TYPE.SPAWN): this.users.set(event.gameId, event); break;
			}
		};

		const npcHandler = (type, event) => {
			switch (type) {
				case (ENTITY_HOOK_TYPE.DESPAWN):
					this.npcs.delete(event.gameId);
					this.summons.delete(event.gameId);
					break;
				case (ENTITY_HOOK_TYPE.SPAWN):
					// eslint-disable-next-line no-magic-numbers
					if (event.huntingZoneId === SPECIAL_ZONES.HELPERS && this.users.has(event.owner)) {
						this.summons.set(event.gameId, event);
					}
					else {
						this.npcs.set(event.gameId, event);
					}
					break;
			}
		};

		const updateAngle = (data, w) => data.loc.w = w;

		const updateAngleHandler = (event) => {
			let gameId = event.gameId;
			if (this.users.has(gameId)) this.users.set(gameId, updateAngle(this.users.get(gameId), event.w));
			else if (this.npcs.has(gameId)) this.npcs.set(gameId, updateAngle(this.npcs.get(gameId), event.w));
			else if (this.summons.has(gameId)) this.summons.set(gameId, updateAngle(this.summons.get(gameId), event.w));
		};

		const userLocationHandler = (event) => {
			if (this.users.has(event.gameId)) {
				let data = this.users.get(event.gameId);
				data.loc = event.loc;
				this.users.set(event.gameId, data);
			}
		};

		const npcLocationHandler = (event) => {
			if (this.npcs.has(event.gameId)) {
				let data = this.npcs.get(event.gameId);
				data.loc = event.loc;
				this.npcs.set(event.gameId, data);
			}
			else if (this.summons.has(event.gameId)) {
				let data = this.summons.get(event.gameId);
				data.loc = event.loc;
				this.summons.set(event.gameId, data);
			}
		};

		const creatureLifeHandler = (event) => {
			if (this.users.has(event.gameId)) {
				let data = this.users.get(event.gameId);
				data.alive = event.alive;
				this.users.set(event.gameId, data);
			}
		};

		const cleanup = () => {
			console.log("DEBUG: unitTracker -> cleanup");
			this.npcs.clear();
			this.summons.clear();
			this.users.clear();
			this.servants.clear();
			this.collections.clear();
			this.drop.clear();
		};

		mod.hook(...proto.getData("S_CREATURE_ROTATE"), HOOK_SETTINGS.FIRST, updateAngleHandler);
		mod.hook(...proto.getData("S_CREATURE_LIFE"), HOOK_SETTINGS.FIRST, creatureLifeHandler);
		mod.hook(...proto.getData("S_NPC_LOCATION"), HOOK_SETTINGS.FIRST, npcLocationHandler);
		mod.hook(...proto.getData("S_USER_LOCATION"), HOOK_SETTINGS.FIRST, userLocationHandler);
		mod.hook(...proto.getData("S_USER_LOCATION_IN_ACTION"), HOOK_SETTINGS.LAST, userLocationHandler);

		//mod.hook("S_ACTION_STAGE", HOOK_SETTINGS.FIRST, locFromAction);
		//mod.hook("S_ACTION_END", HOOK_SETTINGS.FIRST, locFromAction);
		//mod.hook(...def.getVersion("S_EACH_SKILL_RESULT"), HOOK_SETTINGS.FIRST, eachResultUpdate);


		mod.hook(...proto.getData("S_SPAWN_NPC"), HOOK_SETTINGS.FIRST, npcHandler.bind(null, ENTITY_HOOK_TYPE.SPAWN));
		mod.hook(...proto.getData("S_DESPAWN_NPC"), HOOK_SETTINGS.FIRST, npcHandler.bind(null, ENTITY_HOOK_TYPE.DESPAWN));

		mod.hook(...proto.getData("S_SPAWN_USER"), HOOK_SETTINGS.FIRST, userHandler.bind(null, ENTITY_HOOK_TYPE.SPAWN));
		mod.hook(...proto.getData("S_DESPAWN_USER"), HOOK_SETTINGS.FIRST, userHandler.bind(null, ENTITY_HOOK_TYPE.DESPAWN));

		mod.hook(...proto.getData("S_REQUEST_SPAWN_SERVANT"), HOOK_SETTINGS.FIRST, servantsHandler.bind(null, ENTITY_HOOK_TYPE.SPAWN));
		mod.hook(...proto.getData("S_REQUEST_DESPAWN_SERVANT"), HOOK_SETTINGS.FIRST, servantsHandler.bind(null, ENTITY_HOOK_TYPE.DESPAWN));

		mod.hook(...proto.getData("S_SPAWN_COLLECTION"), HOOK_SETTINGS.FIRST, collectionHandler.bind(null, ENTITY_HOOK_TYPE.SPAWN));
		mod.hook(...proto.getData("S_DESPAWN_COLLECTION"), HOOK_SETTINGS.FIRST, collectionHandler.bind(null, ENTITY_HOOK_TYPE.DESPAWN));

		mod.hook(...proto.getData("S_SPAWN_DROPITEM"), HOOK_SETTINGS.FIRST, dropHandler.bind(null, ENTITY_HOOK_TYPE.SPAWN));
		mod.hook(...proto.getData("S_DESPAWN_DROPITEM"), HOOK_SETTINGS.FIRST, dropHandler.bind(null, ENTITY_HOOK_TYPE.DESPAWN));

		mod.hook("S_LOAD_TOPO", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.FIRST, cleanup);
	}
}

module.exports = unitTracker;