"use strict";

/*
* Unit for Fps Manager. Managing client state based on module settings
* Author: SaltyMonkey
* Contributors: 
*/

/**
 * @typedef {import("../fpsManager.js").deps} deps
*/

const utils = require("./helpers/utils");
const { ENTITY_HOOK_TYPE, RAW_HOOK_MODE, HOOK_SETTINGS, DESPAWN_TYPES, EVENTS } = require("./helpers/enums");

class unitFps {
	/**
	*Creates an instance of unitFps
	* @param {deps} deps dependencies
	* @memberof unitFps
	*/
	constructor(deps) {
		const data = deps.data;
		const mod = deps.mod;
		const tracker = deps.tracker;
		const proto = deps.proto;

		let throttlePacketsData = {};

		const blockedPlayers = new Set();
		const blockedNpcs = new Set();
		const blockedSummons = new Set();
		const blockedServants = new Set();
		const blockedDrop = new Set();

		console.log("DEBUG: unitFps -> constructor");

		//-------------------------------------
		// Basic internal functions 
		//-------------------------------------
		const isEntityBlocked = (gameId) => !!((blockedPlayers.has(gameId) || blockedNpcs.has(gameId) || blockedSummons.has(gameId) || blockedServants.has(gameId)));

		const changeShakeState = () => mod.clientInterface.configureCameraShake(!!data.activeMode.blockShakeEffects);

		const isMe = (gameId) => mod.game.me.is(gameId);

		const meInCombat = () => mod.game.me.inCombat;

		const isDropBlockable = (event) => {
			if (data.activeMode.blockDropItems && data.activeMode.blockDropItemsOptions) {
				if (data.activeMode.blockDropItemsOptions.all) {
					return true;
				}
				else if (data.activeMode.blockDropItemsOptions.templateId && utils.arraysHasIntersect(event.templateId, data.activeMode.blockDropItemsOptions.templateId)) {
					return true;
				}
			}
			return false;
		};

		const isCollectionBlockable = () => {
			if (data.activeMode.blockCollections)
				return true;
			return false;
		};

		const isServantBlockable = (event) => {
			if (data.activeMode.blockOwnServants && isMe(event.ownerId)) {
				return true;
			}
			else if (data.activeMode.blockAreaServants) {
				return true;
			}
			return false;
		};

		const isSummonsBlockable = (event) => {
			if (data.activeMode.blockOwnSummons && isMe(event.owner)) {
				return true;
			}
			else if (data.activeMode.blockAreaSummons && !isMe(event.owner)) {
				return true;
			}
			return false;
		};

		const isNpcBlockable = (event) => {
			if (data.activeMode.blockNpcs && data.activeMode.blockNpcsOptions) {
				if (utils.arraysHasIntersect(event.templateId, data.activeMode.blockNpcsOptions.templateId)) {
					return true;
				}
				else if (utils.arraysHasIntersect(event.huntingZoneId, data.activeMode.blockNpcsOptions.huntingZoneId)) {
					return true;
				}
			}
			return false;
		};

		const isUserBlockable = (event) => {
			if (data.activeMode.blockPlayers && data.activeMode.blockPlayersOptions) {
				if (data.activeMode.blockPlayersOptions.all) {
					return true;
				}
				else if (data.activeMode.blockPlayersOptions.class) {
					if (utils.arraysHasIntersect(data.userTemplateToClassMap[event.templateId], data.activeMode.blockPlayersOptions.class)) {
						return true;
					}
				}
				else if (data.activeMode.blockPlayersOptions.name) {
					if (utils.arraysHasIntersect(event.name, data.activeMode.blockPlayersOptions.class)) {
						return true;
					}
				}
			}
			return false;
		};

		//-------------------------------------
		// Handlers for hooks
		//-------------------------------------
		const dropHandler = (type, event) => {
			switch (type) {
				case (ENTITY_HOOK_TYPE.DESPAWN):
					blockedDrop.delete(event.gameId);
					break;
				case (ENTITY_HOOK_TYPE.SPAWN):
					if (isDropBlockable(event)) {
						blockedDrop.add(event.gameId);
						return false;
					}
					break;
			}
		};

		// eslint-disable-next-line no-unused-vars
		const collectionHandler = (type, event) => {
			switch (type) {
				case (ENTITY_HOOK_TYPE.DESPAWN):
					break;
				case (ENTITY_HOOK_TYPE.SPAWN):
					if (isCollectionBlockable()) {
						return false;
					}
					break;
			}
		};

		const servantsHandler = (type, event) => {
			switch (type) {
				case (ENTITY_HOOK_TYPE.DESPAWN):
					blockedServants.delete(event.gameId);
					break;
				case (ENTITY_HOOK_TYPE.SPAWN):
					if (isServantBlockable(event)) {
						blockedServants.add(event.gameId);
						return false;
					}
			}
		};

		const npcHandler = (type, event) => {
			switch (type) {
				case (ENTITY_HOOK_TYPE.DESPAWN):
					if (!blockedNpcs.has(event.gameId) && data.activeMode.blockNpcsDeathAnimations && event.type === DESPAWN_TYPES.DEAD) {
						event.type = DESPAWN_TYPES.OUTOFVIEW;
						return true;
					}
					blockedNpcs.delete(event.gameId);
					break;
				case (ENTITY_HOOK_TYPE.SPAWN):
					if(tracker.spawnedSummons.has(event.gameId) && isSummonsBlockable(event)) {
						blockedSummons.add(event.gameId);
						return false;
					}
					else if (isNpcBlockable(event)) {
						blockedNpcs.add(event.gameId);
						return false;
					}
					break;
			}
		};

		const userHandler = (type, event) => {
			switch (type) {
				case (ENTITY_HOOK_TYPE.DESPAWN):
					blockedPlayers.delete(event.gameId);
					break;
				case (ENTITY_HOOK_TYPE.SPAWN):
					if (isUserBlockable(event)) {
						blockedPlayers.add(event.gameId);
						return false;
					}
					break;
			}
		};

		const projectileHandler = (event) => {
			if (isEntityBlocked(event.gameId)) return false;
			if (data.activeMode.blockProjectiles && data.activeMode.blockProjectilesOptions) {
				if (data.activeMode.blockProjectilesOptions.players && tracker.spawnedPlayers.has(event.gameId)) return false;
			}
		};

		const blockAdditionalSkillEffectsHandler = (event) => {
			if (isEntityBlocked(event.gameId)) return false;
			if (data.activeMode.blockAdditionalSkillEffects && data.activeMode.blockAdditionalSkillEffectsOptions) {
				if (data.activeMode.blockAdditionalSkillEffectsOptions.players && tracker.spawnedPlayers.has(event.gameId)) return false;
				if (data.activeMode.blockAdditionalSkillEffectsOptions.own && isMe(event.gameId)) return false;
			}
		};

		const smtHandler = (event) => (
			(data.activeMode.blockAnnoyingScreenMessages && data.smtData.has(mod.parseSystemMessage(event.message).id))
				? false
				: undefined
		);

		const inventoryHandler = () => (
			(data.activeMode.blockInventoryInCombat && meInCombat()) ? false : undefined
		);

		const blockUselessPacketsHandler = () => (
			(data.activeMode.blockUselessPackets) ? false : undefined
		);

		const throttlePacketsHandler = (name, code, data) => {
			// eslint-disable-next-line no-magic-numbers
			let needBlock = (data.activeMode.throttleSomePackets && throttlePacketsData[name] && (Buffer.compare(throttlePacketsData[name], data) === 0));
			throttlePacketsData[name] = data;
			return needBlock ? true : undefined;
		};

		const abnormalsHandler = (event) => {
			if ((data.activeMode.blockAreaBuffs && !isMe(event.target)) || isEntityBlocked(event.target)) return false;

			if (data.activeMode.blockHuntingRewardsBuffs && data.huntingRewardsBuffs.has(event.id)) return false;
			if (data.activeMode.blockShapeChangeBuffs && data.shapeChangersBuffs.has(event.id)) return false;
			if (data.activeMode.blockOnScreenEffectsBuffs && data.onScreenEffectsBuffs.has(event.id)) return false;
		};

		const blockHpPopups = (event) => {
			if (data.activeMode.blockHpPopups && isMe(event.target)) {
				event.type = 10;
				return true;
			}
		};

		const blockMpPopups = (event) => {
			if (data.activeMode.blockMpPopups && isMe(event.target)) {
				event.type = 0;
				return true;
			}
		};

		const eachSkillResultHandler = (event) => {
			if (isMe(event.source) || isMe(event.owner)) {
				let res = undefined;
				if (data.activeMode.blockOwnHits) {
					event.skill.id = 0;
					event.templateId = 0;
					event.superArmorId = 0;
					event.hitCylinderId = 0;
					event.crit = false;
					event.stackExplode = false;
					event.superArmor = false;
					event.time = 0;
					event.type = 0;
					event.noctEffect = 0;

					res = true;
				}
				if (data.activeMode.blockDamageNumbers) {
					// eslint-disable-next-line no-magic-numbers
					event.value = BigInt(0);
					res = true;
				}
				return res;
			}
			else if (
				data.activeMode.blockAreaHits && (tracker.spawnedPlayers.has(event.owner) || tracker.spawnedPlayers.has(event.source))
				&& !isMe(event.target) && !isMe(event.source) && !isMe(event.owner)
			) {
				event.skill.id = 0;
				event.templateId = 0;
				event.superArmorId = 0;
				event.hitCylinderId = 0;
				event.crit = false;
				event.stackExplode = false;
				event.superArmor = false;
				event.time = 0;
				event.type = 0;
				event.noctEffect = 0;

				return true;

			}
		};

		const fontSwapHandler = () => (data.activeMode.blockDamageNumbers ? false : undefined);

		const dropIfBlockedHandler = (event) => {
			let id = event.target || event.gameId;
			if (isEntityBlocked(id)) return false;
		};

		const actionHandler = (event) => {
			if (isEntityBlocked(event.gameId)) return false;
		};

		const appearanceChangeHandler = (event) => {
			if (isEntityBlocked(event.gameId) || data.activeMode.blockCustomAppearanceChanges) return false;
		};

		const achievementHandler = () => ((data.activeMode.blockAchievementsInCombat && meInCombat()) ? false : undefined);

		const cleanup = () => {
			console.log("DEBUG: unitFps -> cleanup");
			blockedPlayers.clear();
			blockedNpcs.clear();
			blockedSummons.clear();
			blockedServants.clear();
			blockedDrop.clear();
		};

		//-------------------------------------
		// Simple hooks
		//-------------------------------------

		//Simple basic hooks
		data.throttlePacketsData.forEach(packet => { mod.hook(packet, RAW_HOOK_MODE.PAYLOAD, HOOK_SETTINGS.LAST, throttlePacketsHandler); });
		data.lockedPacketsData.forEach(packet => { mod.hook(packet, RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.LAST, blockUselessPacketsHandler); });

		mod.hook(...proto.getData("S_SYSTEM_MESSAGE"), HOOK_SETTINGS.LAST, smtHandler);

		mod.hook("C_SHOW_ITEMLIST", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.LAST, inventoryHandler);
		mod.hook("S_INVEN_USERDATA", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.LAST, inventoryHandler);
		mod.hook("S_ITEMLIST", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.LAST, inventoryHandler);
		mod.hook("S_UPDATE_ACHIEVEMENT_PROGRESS", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.LAST, achievementHandler);

		mod.hook("S_LOAD_TOPO", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.FIRST, cleanup);

		//Basic spawn handling
		mod.hook(...proto.getData("S_DESPAWN_COLLECTION"), HOOK_SETTINGS.LAST, collectionHandler.bind(null, ENTITY_HOOK_TYPE.DESPAWN));
		mod.hook(...proto.getData("S_SPAWN_COLLECTION"), HOOK_SETTINGS.LAST, collectionHandler.bind(null, ENTITY_HOOK_TYPE.SPAWN));

		mod.hook(...proto.getData("S_REQUEST_SPAWN_SERVANT"), HOOK_SETTINGS.LAST, servantsHandler.bind(null, ENTITY_HOOK_TYPE.SPAWN));
		mod.hook(...proto.getData("S_REQUEST_DESPAWN_SERVANT"), HOOK_SETTINGS.LAST, servantsHandler.bind(null, ENTITY_HOOK_TYPE.DESPAWN));

		mod.hook(...proto.getData("S_SPAWN_NPC"), HOOK_SETTINGS.LAST, npcHandler.bind(null, ENTITY_HOOK_TYPE.SPAWN));
		mod.hook(...proto.getData("S_DESPAWN_NPC"), HOOK_SETTINGS.LAST, npcHandler.bind(null, ENTITY_HOOK_TYPE.DESPAWN));

		mod.hook(...proto.getData("S_SPAWN_USER"), HOOK_SETTINGS.FIRST, userHandler.bind(null, ENTITY_HOOK_TYPE.SPAWN));
		mod.hook(...proto.getData("S_DESPAWN_USER"), HOOK_SETTINGS.FIRST, userHandler.bind(null, ENTITY_HOOK_TYPE.DESPAWN));

		mod.hook(...proto.getData("S_SPAWN_DROPITEM"), HOOK_SETTINGS.LAST, dropHandler.bind(null, ENTITY_HOOK_TYPE.SPAWN));
		mod.hook(...proto.getData("S_DESPAWN_DROPITEM"), HOOK_SETTINGS.LAST, dropHandler.bind(null, ENTITY_HOOK_TYPE.DESPAWN));

		//-------------------------------------
		// Cleanup hooks for hidden entities
		//-------------------------------------
		mod.hook(...proto.getData("S_SOCIAL"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_USER_STATUS"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_USER_MOVETYPE"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_FEARMOVE_STAGE"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_FEARMOVE_END"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_USER_LOCATION_IN_ACTION"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_USER_LOCATION"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_CREATURE_ROTATE"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_CREATURE_LIFE"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_NPC_LOCATION"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_MOUNT_VEHICLE"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_UNMOUNT_VEHICLE"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		
		//---------------------------------------
		// Combined hooks with complicated logic
		//---------------------------------------
		mod.hook(...proto.getData("S_INSTANCE_ARROW"), RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.LAST, blockAdditionalSkillEffectsHandler);
		mod.hook(...proto.getData("S_CREATURE_CHANGE_HP"), HOOK_SETTINGS.LAST, blockHpPopups);
		mod.hook(...proto.getData("S_PLAYER_CHANGE_MP"), HOOK_SETTINGS.LAST, blockMpPopups);

		mod.hook(...proto.getData("S_EACH_SKILL_RESULT"), HOOK_SETTINGS.LAST, eachSkillResultHandler);
		mod.hook("S_FONT_SWAP_INFO", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.LAST, fontSwapHandler);

		mod.hook(...proto.getData("S_ACTION_STAGE"), HOOK_SETTINGS.LAST, actionHandler);
		mod.hook(...proto.getData("S_ACTION_END"), HOOK_SETTINGS.LAST, actionHandler);

		mod.hook(...proto.getData("S_ABNORMALITY_BEGIN"), HOOK_SETTINGS.LAST, abnormalsHandler);
		mod.hook(...proto.getData("S_ABNORMALITY_END"), HOOK_SETTINGS.LAST, abnormalsHandler);
		mod.hook(...proto.getData("S_ABNORMALITY_FAIL"), HOOK_SETTINGS.LAST, abnormalsHandler);
		mod.hook(...proto.getData("S_ABNORMALITY_DAMAGE_ABSORB"), HOOK_SETTINGS.LAST, abnormalsHandler);
		mod.hook(...proto.getData("S_ABNORMALITY_RESIST"), HOOK_SETTINGS.LAST, abnormalsHandler);

		mod.hook(...proto.getData("S_SPAWN_PROJECTILE"), HOOK_SETTINGS.LAST, projectileHandler);
		mod.hook(...proto.getData("S_START_USER_PROJECTILE"), HOOK_SETTINGS.LAST, projectileHandler);
		mod.hook(...proto.getData("S_END_USER_PROJECTILE"), HOOK_SETTINGS.LAST, projectileHandler);
		mod.hook(...proto.getData("S_DESPAWN_PROJECTILE"), HOOK_SETTINGS.LAST, projectileHandler);

		mod.hook(...proto.getData("S_USER_APPEARANCE_CHANGE"), HOOK_SETTINGS.LAST, appearanceChangeHandler);
		mod.hook(...proto.getData("S_USER_EXTERNAL_CHANGE"), HOOK_SETTINGS.LAST, appearanceChangeHandler);
		mod.hook(...proto.getData("S_UNICAST_TRANSFORM_DATA"), HOOK_SETTINGS.LAST, appearanceChangeHandler);
		mod.hook(...proto.getData("S_USER_CHANGE_FACE_CUSTOM"), HOOK_SETTINGS.LAST, appearanceChangeHandler);

		deps.data.on(EVENTS.RECONFIGURE, () => {
			console.log("DEBUG: unitFps -> constructor -> reconfigureEvent");
			changeShakeState();
			if (data.prevMode.blockCollections !== data.activeMode.blockCollections) {
				switch (data.activeMode.blockCollections) {
					case (true):
						for (const value of tracker.spawnedCollections.values()) {
							mod.send(...proto.getData("S_DESPAWN_COLLECTION"), value);
						}
						break;
					case (false):
						for (const value of tracker.spawnedCollections.values()) {
							mod.send(...proto.getData("S_SPAWN_COLLECTION"), value);
						}
						break;
				}
			}
			for (const [key, value] of tracker.spawnedDrop.entries()) {
				let needBlock = isDropBlockable(value);
				if (needBlock && !blockedDrop.has(key)) {
					mod.send(...proto.getData("S_DESPAWN_DROPITEM"), value);
					blockedDrop.add(key);
				}
				else if (!needBlock && blockedDrop.has(key)) {
					mod.send(...proto.getData("S_SPAWN_DROPITEM"), value);
					blockedDrop.delete(key);
				}
			}

			for (const [key, value] of tracker.spawnedPlayers.entries()) {
				let needBlock = isUserBlockable(value);
				if (needBlock && !blockedPlayers.has(key)) {
					mod.send(...proto.getData("S_DESPAWN_USER"), value);
					blockedPlayers.add(key);
				}
				else if (!needBlock && blockedPlayers.has(key)) {
					mod.send(...proto.getData("S_SPAWN_USER"), value);
					blockedPlayers.delete(key);
				}
			}

			for (const [key, value] of tracker.spawnedServants.entries()) {
				let needBlock = isServantBlockable(value);
				if (needBlock && !blockedServants.has(key)) {
					mod.send(...proto.getData("S_REQUEST_DESPAWN_SERVANT"), value);
					blockedServants.add(key);
				}
				else if (!needBlock && blockedServants.has(key)) {
					mod.send(...proto.getData("S_REQUEST_SPAWN_SERVANT"), value);
					blockedServants.remove(key);
				}
			}

			for (const [key, value] of tracker.spawnedSummons.entries()) {
				let needBlock = isSummonsBlockable(value);
				if (needBlock && !blockedSummons.has(key)) {
					mod.send(...proto.getData("S_DESPAWN_NPC"), value);
					blockedSummons.add(key);
				}
				else if (!needBlock && blockedSummons.has(key)) {
					mod.send(...proto.getData("S_SPAWN_NPC"), value);
					blockedSummons.remove(key);
				}
			}

			for (const [key, value] of tracker.spawnedNPCS.entries()) {
				let needBlock = isSummonsBlockable(value);
				if (needBlock && !blockedNpcs.has(key)) {
					mod.send(...proto.getData("S_DESPAWN_NPC"), value);
					blockedNpcs.add(key);
				}
				else if (!needBlock && blockedNpcs.has(key)) {
					mod.send(...proto.getData("S_SPAWN_NPC"), value);
					blockedNpcs.remove(key);
				}
			}
		});
	}
}

module.exports = unitFps;