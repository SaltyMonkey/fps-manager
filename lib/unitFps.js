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

		const blockedPlayers = new Set();
		const blockedNpcs = new Set();
		const blockedSummons = new Set();
		const blockedServants = new Set();
		const blockedDrop = new Set();

		//-------------------------------------
		// Basic internal functions 
		//-------------------------------------
		const isEntityBlocked = (gameId) => !!((blockedPlayers.has(gameId) || blockedNpcs.has(gameId) || blockedSummons.has(gameId)));

		const changeShakeState = (state) => mod.clientInterface.configureCameraShake(state);

		const isMe = (gameId) => mod.game.me.is(gameId);

		const meInCombat = () => mod.game.me.inCombat;

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
						else if (data.activeMode.blockDropItemsOptions.templateId && utils.arraysHasIntersect(event.templateId, data.activeMode.blockDropItemsOptions.templateId)) {
							blockedDrop.add(event.gameId);
							return false;
						}
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
					if (data.activeMode.blockCollections) {
						return false;
					}
			}
		};

		const servantsHandler = (type, event) => {
			switch (type) {
				case (ENTITY_HOOK_TYPE.DESPAWN):
					blockedServants.delete(event.gameId);
					break;
				case (ENTITY_HOOK_TYPE.SPAWN):
					if (data.activeMode.blockOwnServants && isMe(event.ownerId)) {
						blockedServants.add(event.gameId);
						return false;
					}
					else if (data.activeMode.blockAreaServants) {
						blockedServants.add(event.gameId);
						return false;
					}
			}
		};

		const npcsHandler = (type, event) => {
			switch (type) {
				case (ENTITY_HOOK_TYPE.DESPAWN):
					if (!blockedNpcs.has(event.gameId) && data.activeMode.blockNpcsDeathAnimations && event.type === DESPAWN_TYPES.DEAD) {
						event.type = DESPAWN_TYPES.OUTOFVIEW;
						return true;
					}
					blockedNpcs.delete(event.gameId);
					break;
				case (ENTITY_HOOK_TYPE.SPAWN):
					if (tracker.summons.has(event.gameId)) {
						if (data.activeMode.blockOwnSummons && isMe(event.owner)) {
							blockedSummons.add(event.gameId);
							return false;
						}
						else if (data.activeMode.blockAreaSummons && !isMe(event.owner)) {
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
				if (data.activeMode.blockProjectilesOptions.own && isMe(event.gameId)) return false;
			}
		};

		const blockAnnoyingScreenMessages = (event) => (
			(data.activeMode.blockAnnoyingScreenMessages && data.smtsSet.has(mod.parseSystemMessage(event.message).id))
				? false
				: undefined
		);

		const blockInventoryInCombat = () => (
			(data.activeMode.blockInventoryInCombat && meInCombat()) ? false : undefined
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
				data.activeMode.blockAreaHits && (tracker.users.has(event.owner) || tracker.users.has(event.source))
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

		const blockAchievementsInCombat = () => ((data.activeMode.blockAchievementSpamInCombat && meInCombat()) ? false : undefined);

		const cleanup = () => {
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
		mod.hook(...proto.getData("S_DESPAWN_COLLECTION"), HOOK_SETTINGS.LAST, collectionHandler.bind(null, ENTITY_HOOK_TYPE.DESPAWN));
		mod.hook(...proto.getData("S_SPAWN_COLLECTION"), HOOK_SETTINGS.LAST, collectionHandler.bind(null, ENTITY_HOOK_TYPE.SPAWN));

		mod.hook(...proto.getData("S_REQUEST_SPAWN_SERVANT"), HOOK_SETTINGS.LAST, servantsHandler.bind(null, ENTITY_HOOK_TYPE.SPAWN));
		mod.hook(...proto.getData("S_REQUEST_DESPAWN_SERVANT"), HOOK_SETTINGS.LAST, servantsHandler.bind(null, ENTITY_HOOK_TYPE.DESPAWN));

		mod.hook(...proto.getData("S_SPAWN_NPC"), HOOK_SETTINGS.LAST, npcsHandler.bind(null, ENTITY_HOOK_TYPE.SPAWN));
		mod.hook(...proto.getData("S_DESPAWN_NPC"), HOOK_SETTINGS.LAST, npcsHandler.bind(null, ENTITY_HOOK_TYPE.DESPAWN));

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

		deps.data.on(EVENTS.RECONFIGURE, (oldMode, newMode) => {
			let spawnCollections = oldMode.blockCollections !== newMode.blockCollections && newMode.blockCollections === false;
			let spawnOwnServants = oldMode.blockOwnServants !== newMode.blockOwnServants && newMode.blockOwnServants === false;
			let spawnAreaServants = oldMode.blockAreaServants !== newMode.blockAreaServants && newMode.blockAreaServants === false;
			let spawnOwnSummons = oldMode.blockOwnSummons !== newMode.blockOwnSummons && newMode.blockOwnSummons === false;
			let spawnAreaSummons = oldMode.blockAreaSummons !== newMode.blockAreaSummons && newMode.blockAreaSummons === false;

			if (oldMode.blockShakeEffects !== newMode.blockShakeEffects) {
				changeShakeState(newMode.blockShakeEffects);
			}
			//respawn collections back (nothing to analyze so we are just using original data )
			if(spawnCollections) {
				[...tracker.collections.values()].forEach(event => {
					mod.send(...proto.getData("S_SPAWN_COLLECTION"), event);
				});
			}
			
			if(spawnOwnServants || spawnAreaServants) {
				let elems = utils.arraysIntersect([...blockedServants.keys()], [...tracker.servants.keys()]);

				elems.forEach(id => {
					let event = tracker.servants.get(id);
					if((isMe(event.ownerId) && spawnOwnServants) || (!isMe(event.ownerId) && spawnAreaServants)) {
						mod.send(...proto.getData("S_REQUEST_SPAWN_SERVANT"), event);
						blockedServants.delete(id);
					}
				});
			}

			if(spawnOwnSummons || spawnAreaSummons) {
				let elems = utils.arraysIntersect([...blockedSummons.keys()], [...tracker.summons.keys()]);

				elems.forEach(id => {
					let event = tracker.summons.get(id);
					if((isMe(event.owner) && spawnOwnSummons) || (!isMe(event.owner) && spawnAreaSummons)) {
						mod.send(...proto.getData("S_SPAWN_NPC"), event);
						blockedSummons.delete(id);
					}
				});
			}

		});
	}
}

module.exports = unitFps;