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

		let throttledDAta = {};

		let blockedCollections = new Set();
		let blockedPlayers = new Set();
		let blockedNpcs = new Set();
		let blockedSummons = new Set();
		let blockedServants = new Set();
		let blockedDrop = new Set();

		//-------------------------------------
		// Basic internal functions 
		//-------------------------------------
		const isEntityBlocked = (gameId) => !!((blockedPlayers.has(gameId) || blockedNpcs.has(gameId) || blockedSummons.has(gameId)));

		const changeShakeState = (state) => mod.clientInterface.configureCameraShake(state);

		//-------------------------------------
		// Handlers for hooks
		//-------------------------------------
		const dropHandler = (type, event) => {
			switch (type) {
				case (ENTITY_HOOK_TYPE.DESPAWN):
					blockedDrop.delete(event.gameId);
					break;
				case (ENTITY_HOOK_TYPE.SPAWN):
					if (data.activeMode.blockCollections && data.activeMode.blockDropItemsOptions) {
						if (data.activeMode.blockDropItemsOptions.all) {
							blockedDrop.add(event.gameId);
							return false;
						}
						else if (utils.arraysHasIntersect(event.templateId, data.activeMode.blockDropItemsOptions.templateId)) {
							blockedDrop.add(event.gameId);
							return false;
						}
					}
					break;
			}
		};

		const blockCollections = (type, event) => {
			switch (type) {
				case (ENTITY_HOOK_TYPE.DESPAWN):
					blockedCollections.delete(event.gameId);
					break;
				case (ENTITY_HOOK_TYPE.SPAWN):
					if (data.activeMode.blockCollections) {
						blockedCollections.add(event.gameId);
						return false;
					}
			}
		};

		const blockServants = (type, event) => {
			switch (type) {
				case (ENTITY_HOOK_TYPE.DESPAWN): blockedServants.delete(event.gameId); break;
				case (ENTITY_HOOK_TYPE.SPAWN):
					if (data.activeMode.blockOwnServants && mod.game.me.is(event.ownerId)) {
						blockedServants.add(event.gameId);
						return false;
					}
					else if (data.activeMode.blockAreaServants) {
						blockedServants.add(event.gameId);
						return false;
					}
			}
		};

		const npcHandler = (type, event) => {
			switch (type) {
				case (ENTITY_HOOK_TYPE.DESPAWN):
					blockedNpcs.delete(event.gameId);
					if (!blockedNpcs.has(event.gameId) && data.activeMode.blockNpcsDeathAnimations && event.type === DESPAWN_TYPES.DEAD) {
						event.type = DESPAWN_TYPES.OUTOFVIEW;
						return true;
					}
					break;
				case (ENTITY_HOOK_TYPE.SPAWN):
					if (tracker.summons.has(event.gameId)) {
						if (data.activeMode.blockOwnSummons && mod.game.me.is(event.owner)) {
							blockedSummons.add(event.gameId);
							return false;
						}
						else if (data.activeMode.blockAreaSummons && !mod.game.me.is(event.owner)) {
							blockedSummons.add(event.gameId);
							return false;
						}
					}
					if (data.activeMode.blockNpcs && data.activeMode.blockNpcsOptions) {
						if (utils.arraysHasIntersect(event.templateId, data.activeMode.blockNpcsOptions.templateId)) {
							blockedNpcs.add(event.gameId);
							return false;
						}
						else if (utils.arraysHasIntersect(event.huntingZoneId, data.activeMode.blockNpcsOptions.huntingZoneId)) {
							blockedNpcs.add(event.gameId);
							return false;
						}

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
					if (data.activeMode.blockPlayers && data.activeMode.blockPlayersOptions) {
						if (data.activeMode.blockPlayersOptions.all) {
							blockedPlayers.add(event.gameId);
							return false;
						}
						else if (data.activeMode.blockPlayersOptions.class) {
							if (utils.arraysHasIntersect(data.userTemplateToClassMap[event.templateId], data.activeMode.blockPlayersOptions.class)) {
								blockedPlayers.add(event.gameId);
								return false;
							}
						}
					}
					break;
			}
		};

		const projectileHandler = (event) => {
			if (isEntityBlocked(event.gameId)) return false;
			if (data.activeMode.blockProjectiles && data.activeMode.blockProjectilesOptions) {
				if (data.activeMode.blockProjectilesOptions.players && tracker.users.has(event.gameId)) return false;
			}
		};

		const blockAdditionalSkillEffectsHandler = (event) => {
			if (isEntityBlocked(event.gameId)) return false;
			if (data.activeMode.blockAdditionalSkillEffects && data.activeMode.blockAdditionalSkillEffectsOptions) {
				if (data.activeMode.blockProjectilesOptions.players && tracker.users.has(event.gameId)) return false;
				if (data.activeMode.blockProjectilesOptions.own && mod.game.me.is(event.gameId)) return false;
			}
		};

		const blockAnnoyingScreenMessages = (event) => (
			(data.activeMode.blockAnnoyingScreenMessages && data.smtsSet.has(mod.parseSystemMessage(event.message).id))
				? false
				: undefined
		);

		const blockInventoryInCombat = () => (
			(data.activeMode.blockInventoryInCombat && mod.game.me.inCombat) ? false : undefined
		);

		const blockUselessPackets = () => (
			(data.activeMode.blockUselessPackets) ? false : undefined
		);

		const throttlePackets = (name, code, data) => {
			// eslint-disable-next-line no-magic-numbers
			let needBlock = (data.activeMode.throttleSomePackets && throttledDAta[name] && (Buffer.compare(throttledDAta[name], data) === 0));
			throttledDAta[name] = data;
			return needBlock ? true : undefined;
		};

		const abnormieHandler = (event) => {
			if ((data.activeMode.blockAreaBuffs && !mod.game.me.is(event.target)) || isEntityBlocked(event.target)) return false;

			//if (mod.game.me.is(event.target)) {
			if (data.activeMode.blockHuntingRewardsBuffs && data.huntingRewardsBuffs.has(event.id)) return false;
			if (data.activeMode.blockShapeChangeBuffs && data.shapeChangersBuffs.has(event.id)) return false;
			if (data.activeMode.blockOnScreenEffectsBuffs && data.onScreenEffectsBuffs.has(event.id)) return false;
			//}
		};

		const blockHpPopups = (event) => {
			if (data.activeMode.blockHpPopups && mod.game.me.is(event.target)) {
				event.type = 10;
				return true;
			}
		};

		const blockMpPopups = (event) => {
			if (data.activeMode.blockMpPopups && mod.game.me.is(event.target)) {
				event.type = 0;
				return true;
			}
		};

		const eachSkillResultHandler = (event) => {
			if (mod.game.me.is(event.source) || mod.game.me.is(event.owner)) {
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
				data.activeMode.blockAreaHits && (tracker.users.has(event.owner) || tracker.users.has(event.source))
				&& !mod.game.me.is(event.target) && !mod.game.me.is(event.source) && !mod.game.me.is(event.owner)
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

		const blockAchievementsInCombat = () => ((data.activeMode.blockAchievementSpamInCombat && mod.game.me.inCombat) ? false : undefined);

		const cleanup = () => {
			blockedCollections.clear();
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
		data.throttlePacketsData.forEach(packet => { mod.hook(packet, RAW_HOOK_MODE.PAYLOAD, HOOK_SETTINGS.LAST, throttlePackets); });
		data.lockedPacketsData.forEach(packet => { mod.hook(packet, RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.LAST, blockUselessPackets); });

		mod.hook(...proto.getData("S_SYSTEM_MESSAGE"), HOOK_SETTINGS.LAST, blockAnnoyingScreenMessages);
		mod.hook("C_SHOW_ITEMLIST", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.LAST, blockInventoryInCombat);
		mod.hook("S_INVEN_USERDATA", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.LAST, blockInventoryInCombat);
		mod.hook("S_ITEMLIST", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.LAST, blockInventoryInCombat);
		mod.hook("S_UPDATE_ACHIEVEMENT_PROGRESS", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.LAST, blockAchievementsInCombat);
		
		mod.hook("S_LOAD_TOPO", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.FIRST, cleanup);

		//Basic spawn handling
		mod.hook(...proto.getData("S_DESPAWN_COLLECTION"), HOOK_SETTINGS.LAST, blockCollections.bind(null, ENTITY_HOOK_TYPE.DESPAWN));
		mod.hook(...proto.getData("S_SPAWN_COLLECTION"), HOOK_SETTINGS.LAST, blockCollections.bind(null, ENTITY_HOOK_TYPE.SPAWN));

		mod.hook(...proto.getData("S_REQUEST_SPAWN_SERVANT"), HOOK_SETTINGS.LAST, blockServants.bind(null, ENTITY_HOOK_TYPE.SPAWN));
		mod.hook(...proto.getData("S_REQUEST_DESPAWN_SERVANT"), HOOK_SETTINGS.LAST, blockServants.bind(null, ENTITY_HOOK_TYPE.DESPAWN));

		mod.hook(...proto.getData("S_SPAWN_NPC"), HOOK_SETTINGS.LAST, npcHandler.bind(null, ENTITY_HOOK_TYPE.SPAWN));
		mod.hook(...proto.getData("S_DESPAWN_NPC"), HOOK_SETTINGS.LAST, npcHandler.bind(null, ENTITY_HOOK_TYPE.DESPAWN));

		mod.hook(...proto.getData("S_SPAWN_USER"), HOOK_SETTINGS.FIRST, userHandler.bind(null, ENTITY_HOOK_TYPE.SPAWN));
		mod.hook(...proto.getData("S_DESPAWN_USER"), HOOK_SETTINGS.FIRST, userHandler.bind(null, ENTITY_HOOK_TYPE.DESPAWN));

		mod.hook(...proto.getData("S_SPAWN_DROPITEM"), HOOK_SETTINGS.LAST, dropHandler.bind(null, ENTITY_HOOK_TYPE.SPAWN));
		mod.hook(...proto.getData("S_DESPAWN_DROPITEM"), HOOK_SETTINGS.LAST, dropHandler.bind(null, ENTITY_HOOK_TYPE.DESPAWN));

		//-------------------------------------
		// Cleanup hooks for entities
		//-------------------------------------
		mod.hook(...proto.getData("S_SOCIAL"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_USER_STATUS"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_USER_MOVETYPE"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_FEARMOVE_STAGE"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_FEARMOVE_END"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_USER_LOCATION_IN_ACTION"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_USER_LOCATION"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		
		//---------------------------------------
		// Combined hooks with complicated logic
		//---------------------------------------
		mod.hook(...proto.getData("S_INSTANCE_ARROW"), RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.LAST, blockAdditionalSkillEffectsHandler);
		mod.hook(...proto.getData("S_CREATURE_CHANGE_HP"), HOOK_SETTINGS.LAST, blockHpPopups);
		mod.hook(...proto.getData("S_PLAYER_CHANGE_MP"), HOOK_SETTINGS.LAST, blockMpPopups);

		mod.hook(...proto.getData("S_EACH_SKILL_RESULT"), HOOK_SETTINGS.LAST, eachSkillResultHandler);

		mod.hook(...proto.getData("S_ACTION_STAGE"), HOOK_SETTINGS.LAST, actionHandler);
		mod.hook(...proto.getData("S_ACTION_END"), HOOK_SETTINGS.LAST, actionHandler);

		mod.hook(...proto.getData("S_ABNORMALITY_BEGIN"), HOOK_SETTINGS.LAST, abnormieHandler);
		mod.hook(...proto.getData("S_ABNORMALITY_END"), HOOK_SETTINGS.LAST, abnormieHandler);
		mod.hook(...proto.getData("S_ABNORMALITY_FAIL"), HOOK_SETTINGS.LAST, abnormieHandler);
		mod.hook(...proto.getData("S_ABNORMALITY_DAMAGE_ABSORB"), HOOK_SETTINGS.LAST, abnormieHandler);
		mod.hook(...proto.getData("S_ABNORMALITY_RESIST"), HOOK_SETTINGS.LAST, abnormieHandler);

		mod.hook(...proto.getData("S_SPAWN_PROJECTILE"), HOOK_SETTINGS.LAST, projectileHandler);
		mod.hook(...proto.getData("S_START_USER_PROJECTILE"), HOOK_SETTINGS.LAST, projectileHandler);
		mod.hook(...proto.getData("S_END_USER_PROJECTILE"), HOOK_SETTINGS.LAST, projectileHandler);
		mod.hook(...proto.getData("S_DESPAWN_PROJECTILE"), HOOK_SETTINGS.LAST, projectileHandler);

		mod.hook(...proto.getData("S_USER_APPEARANCE_CHANGE"), HOOK_SETTINGS.LAST, appearanceChangeHandler);
		mod.hook(...proto.getData("S_USER_EXTERNAL_CHANGE"), HOOK_SETTINGS.LAST, appearanceChangeHandler);
		mod.hook(...proto.getData("S_UNICAST_TRANSFORM_DATA"), HOOK_SETTINGS.LAST, appearanceChangeHandler);
		mod.hook(...proto.getData("S_USER_CHANGE_FACE_CUSTOM"), HOOK_SETTINGS.LAST, appearanceChangeHandler);

		deps.data.on(EVENTS.RECONFIGURE, (oldMode, newMode) => {
			if (oldMode.blockShakeEffects !== newMode.blockShakeEffects) {
				changeShakeState(newMode.blockShakeEffects);
			}
			if (oldMode.blockCollections !== newMode.blockCollections && newMode.blockCollections === true) {
				mod.send(...proto.getData("S_SPAWN_COLLECTION"), tracker);
			}
		});
	}
}

module.exports = unitFps;