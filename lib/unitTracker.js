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

		// portals "shapeId": 652992,
		// ninja log "shapeId": 303030
		// sentinel "shapeId": 730500

		Object.assign(this, {
			"spawnedCollections": new Map(),
			"spawnedDrop": new Map(),
			"spawnedServants": new Map(),
			"spawnedPlayers": new Map(),
			"spawnedNPCS": new Map(),
			"spawnedSummons": new Map(),
			"spawnedBuildObjects": new Map()
		});

		const dropHandler = (type, event) => {
			switch (type) {
				case (ENTITY_HOOK_TYPE.DESPAWN): this.spawnedDrop.delete(event.gameId); break;
				case (ENTITY_HOOK_TYPE.SPAWN): this.spawnedDrop.set(event.gameId, event); break;
			}
		};

		const collectionHandler = (type, event) => {
			switch (type) {
				case (ENTITY_HOOK_TYPE.DESPAWN): this.spawnedCollections.delete(event.gameId); break;
				case (ENTITY_HOOK_TYPE.SPAWN): this.spawnedCollections.set(event.gameId, event); break;
			}
		};

		const buildObjectHandler = (type, event) => {
			switch (type) {
				case (ENTITY_HOOK_TYPE.DESPAWN): this.spawnedBuildObjects.delete(event.gameId); break;
				case (ENTITY_HOOK_TYPE.SPAWN): this.spawnedBuildObjects.set(event.gameId, event); break;
			}
		};

		const servantsHandler = (type, event) => {
			switch (type) {
				case (ENTITY_HOOK_TYPE.DESPAWN): this.spawnedServants.delete(event.gameId); break;
				case (ENTITY_HOOK_TYPE.SPAWN): this.spawnedServants.set(event.gameId, event); break;
			}
		};

		const userHandler = (type, event) => {
			switch (type) {
				case (ENTITY_HOOK_TYPE.DESPAWN): this.spawnedPlayers.delete(event.gameId); break;
				case (ENTITY_HOOK_TYPE.SPAWN): this.spawnedPlayers.set(event.gameId, event); break;
			}
		};

		const npcHandler = (type, event) => {
			switch (type) {
				case (ENTITY_HOOK_TYPE.DESPAWN):
					this.spawnedNPCS.delete(event.gameId);
					this.spawnedSummons.delete(event.gameId);
					break;
				case (ENTITY_HOOK_TYPE.SPAWN):
					if (!event.bySpawnEvent && event.huntingZoneId === SPECIAL_ZONES.HELPERS && this.spawnedPlayers.has(event.owner)) {
						this.spawnedSummons.set(event.gameId, event);
					}
					else {
						this.spawnedNPCS.set(event.gameId, event);
					}

					// eslint-disable-next-line no-magic-numbers
					if (event.replaceId !== BigInt(0)) {
						this.spawnedNPCS.delete(event.replaceId);
						this.spawnedSummons.delete(event.replaceId);
					}

					break;
			}
		};

		const userMounted = (type, event) => {
			if (this.spawnedPlayers.has(event.gameId)) {
				let data = undefined;
				switch (type) {
					case (ENTITY_HOOK_TYPE.DESPAWN):
						data = this.spawnedPlayers.get(event.gameId);
						data.mount = 0;
						this.spawnedPlayers.set(event.gameId, data);
						break;
					case (ENTITY_HOOK_TYPE.SPAWN):
						data = this.spawnedPlayers.get(event.gameId);
						data.mount = event.id;
						this.spawnedPlayers.set(event.gameId, data);
						break;
				}
			}
		};

		const updateAngle = (data, w) => {
			data.loc.w = w;
			return data;
		};

		const updateLoc = (data, loc) => {
			data.loc = loc;
			return data;
		};

		const updateAngleHandler = (event) => {
			let gameId = event.gameId;
			if (this.spawnedPlayers.has(gameId)) this.spawnedPlayers.set(gameId, updateAngle(this.spawnedPlayers.get(gameId), event.w));
			else if (this.spawnedNPCS.has(gameId)) this.spawnedNPCS.set(gameId, updateAngle(this.spawnedNPCS.get(gameId), event.w));
			else if (this.spawnedSummons.has(gameId)) this.spawnedSummons.set(gameId, updateAngle(this.spawnedSummons.get(gameId), event.w));
		};

		const playerLocationHandler = (event) => {
			if (this.spawnedPlayers.has(event.gameId)) {
				this.spawnedPlayers.set(event.gameId, updateLoc(this.spawnedPlayers.get(event.gameId), event.loc));
			}
		};

		const npcLocationHandler = (event) => {
			if (this.spawnedNPCS.has(event.gameId)) {
				this.spawnedNPCS.set(event.gameId, updateLoc(this.spawnedNPCS.get(event.gameId), event.loc));
			}
			else if (this.spawnedSummons.has(event.gameId)) {
				this.spawnedSummons.set(event.gameId, updateLoc(this.spawnedSummons.get(event.gameId), event.loc));
			}
			else if (this.spawnedServants.has(event.gameId)) {
				this.spawnedServants.set(event.gameId, updateLoc(this.spawnedServants.get(event.gameId), event.loc));
			}
		};

		const creatureLifeHandler = (event) => {
			if (this.spawnedPlayers.has(event.gameId)) {
				let data = this.spawnedPlayers.get(event.gameId);
				data.alive = event.alive;
				this.spawnedPlayers.set(event.gameId, data);
			}
		};

		const cleanup = () => {
			this.spawnedNPCS.clear();
			this.spawnedSummons.clear();
			this.spawnedPlayers.clear();
			this.spawnedServants.clear();
			this.spawnedCollections.clear();
			this.spawnedDrop.clear();
			this.spawnedBuildObjects.clear();
		};

		const bullrushHandler = (event) => {
			playerLocationHandler(event);
			npcLocationHandler(event);
		};

		mod.hook(...proto.getData("S_CREATURE_ROTATE"), HOOK_SETTINGS.FIRST, updateAngleHandler);
		mod.hook(...proto.getData("S_CREATURE_LIFE"), HOOK_SETTINGS.FIRST, creatureLifeHandler);
		mod.hook(...proto.getData("S_NPC_LOCATION"), HOOK_SETTINGS.FIRST, npcLocationHandler);
		mod.hook(...proto.getData("S_USER_LOCATION"), HOOK_SETTINGS.FIRST, playerLocationHandler);
		mod.hook(...proto.getData("S_STICK_TO_USER_END"), HOOK_SETTINGS.LAST, bullrushHandler);

		mod.hook(...proto.getData("S_USER_LOCATION_IN_ACTION"), HOOK_SETTINGS.FIRST, playerLocationHandler);
		mod.hook(...proto.getData("S_MOUNT_VEHICLE"), HOOK_SETTINGS.FIRST, userMounted.bind(null, ENTITY_HOOK_TYPE.SPAWN));
		mod.hook(...proto.getData("S_UNMOUNT_VEHICLE"), HOOK_SETTINGS.FIRST, userMounted.bind(null, ENTITY_HOOK_TYPE.SPAWN));

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

		mod.hook(...proto.getData("S_SPAWN_BUILD_OBJECT"), HOOK_SETTINGS.FIRST, buildObjectHandler.bind(null, ENTITY_HOOK_TYPE.SPAWN));
		mod.hook(...proto.getData("S_DESPAWN_BUILD_OBJECT"), HOOK_SETTINGS.FIRST, buildObjectHandler.bind(null, ENTITY_HOOK_TYPE.DESPAWN));

		mod.hook("S_LOAD_TOPO", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.FIRST, cleanup);
	}
}

module.exports = unitTracker;