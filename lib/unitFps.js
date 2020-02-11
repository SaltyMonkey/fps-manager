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
const { ENTITY_HOOK_TYPE, RAW_HOOK_MODE, HOOK_SETTINGS, DESPAWN_TYPES, EVENTS, HPCHANGE, MPCHANGE } = require("./helpers/enums");

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

		const partyMembers = new Map();

		console.log("DEBUG: unitFps -> constructor");

		//-------------------------------------
		// Basic internal functions 
		//-------------------------------------
		// eslint-disable-next-line arrow-body-style
		const isEntityBlocked = (gameId) => {
			return (blockedPlayers.has(gameId) || blockedNpcs.has(gameId) || blockedSummons.has(gameId) || blockedServants.has(gameId));
		};

		const changeShakeState = () => {
			mod.clientInterface.configureCameraShake(!data.activeMode.blockShakeEffects);
		};

		const isMe = (gameId) => mod.game.me.is(gameId);

		const meInCombat = () => mod.game.me.inCombat;

		const isDropBlockable = (event) => {
			if (data.activeMode.blockDropItems) {
				if (data.activeMode.blockDropItems.all)
					return true;
				else if (data.activeMode.blockDropItems.templateId && utils.arraysHasIntersect(event.templateId, data.activeMode.blockDropItems.templateId))
					return true;
			}
			return false;
		};

		const isCollectionBlockable = () => {
			if (data.activeMode.blockGatherNode)
				return true;
			return false;
		};

		const isServantBlockable = (event) => {
			if (data.activeMode.blockServants) {
				if (data.activeMode.blockServants.me && isMe(event.ownerId))
					return true;
				else if (data.activeMode.blockServants.area && !isMe(event.ownerId))
					return true;
			}
			return false;
		};

		const isSummonsBlockable = (event) => {
			if (data.activeMode.blockSummons) {
				if (data.activeMode.blockSummons.me && isMe(event.owner))
					return true;
				else if (data.activeMode.blockSummons.area && !isMe(event.owner))
					return true;
			}
			return false;
		};

		const isNpcBlockable = (event) => {
			if (data.activeMode.blockNpcs) {
				if (utils.arraysHasIntersect(event.templateId, data.activeMode.blockNpcs.templateId))
					return true;
				else if (utils.arraysHasIntersect(event.huntingZoneId, data.activeMode.blockNpcs.huntingZoneId))
					return true;
			}
			return false;
		};

		const isPlayerBlockable = (event) => {
			if (data.activeMode.blockPlayers) {
				if (data.activeMode.blockPlayers.keepParty && partyMembers.has(event.gameId))
					return false;

				if (data.activeMode.blockPlayers.all) {
					return true;
				}
				else if (data.activeMode.blockPlayers.class) {
					if (utils.arraysHasIntersect(data.userTemplateToClassMap[event.templateId], data.activeMode.blockPlayers.class))
						return true;
				}
				else if (data.activeMode.blockPlayers.name) {
					if (utils.arraysHasIntersect(event.name, data.activeMode.blockPlayers.name))
						return true;
				}
			}
			return false;
		};

		const isSkillBlockable = (event) => {
			if (isMe(event.gameId) || event.skill.npc) return false;
			if (data.activeMode.blockSkills) {
				if (data.activeMode.blockSkills.all)
					return true;
				if (data.activeMode.blockSkills.class && utils.arraysHasIntersect(data.userTemplateToClassMap[event.templateId], data.activeMode.blockSkills.class))
					return true;
				else if (data.activeMode.blockPlayers.rawId && utils.arraysHasIntersect(event.skill.id, data.activeMode.blockSkills.rawId))
					return true;
				else if (data.activeMode.blockPlayers.extended && data.activeMode.blockPlayers.extended[data.userTemplateToClassMap[event.templateId]])
					if (data.activeMode.blockPlayers.extended[data.userTemplateToClassMap[event.templateId]][utils.getSkillBase(event.skill.id)]) //TODO: refactor it
						return true;
			}
			return false;
		};

		const isProjectileBlockable = (event) => {
			if (data.activeMode.blockProjectiles) {
				if (data.activeMode.blockProjectiles.players && tracker.spawnedPlayers.has(event.gameId)) return true;
			}
			return false;
		};

		const isEffectBlockable = (event) => {
			if (data.activeMode.blockAdditionalSkillEffects) {
				if (data.activeMode.blockAdditionalSkillEffects.players && tracker.spawnedPlayers.has(event.gameId)) return true;
				if (data.activeMode.blockAdditionalSkillEffects.own && isMe(event.gameId)) return true;
			}
			return false;
		};

		const isAbnormalBlockable = (event) => {
			if (data.activeMode.blockBuffs) {
				if (isEntityBlocked(event.target) || (data.activeMode.blockBuffs.area && !isMe(event.target) && !tracker.spawnedNPCS.has(event.target))) return true;

				if (data.activeMode.blockBuffs.huntRewards && data.huntingRewardsBuffs.has(event.id)) return true;
				if (data.activeMode.blockBuffs.shapeChange && data.shapeChangersBuffs.has(event.id)) return true;
				if (data.activeMode.blockBuffs.effects && data.onScreenEffectsBuffs.has(event.id)) return true;
			}
			return false;
		};

		//-------------------------------------
		// Reconfigure area handlers
		//-------------------------------------
		const reconfigurePlayers = () => {
			for (const [key, value] of tracker.spawnedPlayers.entries()) {
				let needBlock = isPlayerBlockable(value);
				if (needBlock && !blockedPlayers.has(key)) {
					mod.send(...proto.getData("S_DESPAWN_USER"), { "gameId": value.gameId, "type": DESPAWN_TYPES.OUTOFVIEW });
					blockedPlayers.add(key);
				}
				else if (!needBlock && blockedPlayers.has(key)) {
					mod.send(...proto.getData("S_SPAWN_USER"), value);
					blockedPlayers.delete(key);
				}
			}
		};

		const reconfigureDrop = () => {
			for (const [key, value] of tracker.spawnedDrop.entries()) {
				let needBlock = isDropBlockable(value);
				if (needBlock && !blockedDrop.has(key)) {
					mod.send(...proto.getData("S_DESPAWN_DROPITEM"), { "gameId": value.gameId });
					blockedDrop.add(key);
				}
				else if (!needBlock && blockedDrop.has(key)) {
					mod.send(...proto.getData("S_SPAWN_DROPITEM"), value);
					blockedDrop.delete(key);
				}
			}
		};

		const reconfigureServants = () => {
			for (const [key, value] of tracker.spawnedServants.entries()) {
				let needBlock = isServantBlockable(value);
				if (needBlock && !blockedServants.has(key)) {
					mod.send(...proto.getData("S_REQUEST_DESPAWN_SERVANT"), { "gameId": value.gameId, "type": DESPAWN_TYPES.OUTOFVIEW });
					blockedServants.add(key);
				}
				else if (!needBlock && blockedServants.has(key)) {
					mod.send(...proto.getData("S_REQUEST_SPAWN_SERVANT"), value);
					blockedServants.delete(key);
				}
			}
		};

		const reconfigureSummons = () => {
			for (const [key, value] of tracker.spawnedSummons.entries()) {
				let needBlock = isSummonsBlockable(value);
				if (needBlock && !blockedSummons.has(key)) {
					mod.send(...proto.getData("S_DESPAWN_NPC"), { "gameId": value.gameId, "type": DESPAWN_TYPES.OUTOFVIEW, "loc": value.loc });
					blockedSummons.add(key);
				}
				else if (!needBlock && blockedSummons.has(key)) {
					mod.send(...proto.getData("S_SPAWN_NPC"), value);
					blockedSummons.delete(key);
				}
			}
		};

		const reconfigureNpcs = () => {
			for (const [key, value] of tracker.spawnedNPCS.entries()) {
				let needBlock = isNpcBlockable(value);
				if (needBlock && !blockedNpcs.has(key)) {
					mod.send(...proto.getData("S_DESPAWN_NPC"), { "gameId": value.gameId, "type": DESPAWN_TYPES.OUTOFVIEW, "loc": value.loc });
					blockedNpcs.add(key);
				}
				else if (!needBlock && blockedNpcs.has(key)) {
					mod.send(...proto.getData("S_SPAWN_NPC"), value);
					blockedNpcs.delete(key);
				}
			}
		};

		const reconfigureCollections = () => {
			if (data.prevMode.blockGatherNode !== data.activeMode.blockGatherNode) {
				switch (data.activeMode.blockGatherNode) {
					case (true):
						for (const value of tracker.spawnedCollections.values()) {
							mod.send(...proto.getData("S_DESPAWN_COLLECTION"), { "gameId": value.gameId, "collected": false });
						}
						break;
					case (false):
						for (const value of tracker.spawnedCollections.values()) {
							mod.send(...proto.getData("S_SPAWN_COLLECTION"), value);
						}
						break;
				}
			}
		};

		//-------------------------------------
		// Hooks handlers
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
					if (isCollectionBlockable()) return false;
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
					if (tracker.spawnedSummons.has(event.gameId) && isSummonsBlockable(event)) {
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
					if (isPlayerBlockable(event)) {
						blockedPlayers.add(event.gameId);
						return false;
					}
					break;
			}
		};

		const projectileHandler = (event) => {
			if (isEntityBlocked(event.gameId)) return false;
			if (isProjectileBlockable(event)) return false;
		};

		const blockAdditionalSkillEffectsHandler = (event) => {
			if (isEntityBlocked(event.gameId)) return false;
			if (isEffectBlockable(event)) return false;
		};

		const smtHandler = (event) => {
			if (data.activeMode.blockAnnoyingScreenMessages && data.smtData.has(mod.parseSystemMessage(event.message).id)) return false;
		};

		const inventoryHandler = () => {
			if (data.activeMode.blockInventoryInCombat && meInCombat()) return false;
		};

		const blockUselessPacketsHandler = () => {
			if (data.activeMode.blockUselessPackets) return false;
		};

		const throttlePacketsHandler = (name, code, payload) => {
			// eslint-disable-next-line no-magic-numbers
			let needBlock = (data.activeMode.throttleSomePackets && throttlePacketsData[name] && (throttlePacketsData[name].equals(payload)));
			throttlePacketsData[name] = payload;
			return needBlock ? false : undefined;
		};

		const abnormalsHandler = (event) => {
			if (isAbnormalBlockable(event)) return false;
		};

		const creatureChangeHpHandler = (event) => {
			if (data.activeMode.blockNumbersPopups && data.activeMode.blockNumbersPopups.hp && isMe(event.target)) {
				if (event.type !== HPCHANGE.NORMAL) {
					event.type = HPCHANGE.NORMAL;
					return true;
				}
			}
		};

		const creatureChangeMpHandler = (event) => {
			if (data.activeMode.blockNumbersPopups && data.activeMode.blockNumbersPopups.mp && isMe(event.target)) {
				if (event.type !== MPCHANGE.DEFAULT) {
					event.type = MPCHANGE.DEFAULT;
					return true;
				}
			}
		};

		const eachSkillResultHandler = (event) => {
			if (isMe(event.source) || isMe(event.owner)) {
				let res = undefined;
				if (data.activeMode.blockHits && data.activeMode.blockHits.me) {
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
				if (data.activeMode.blockNumbersPopups && data.activeMode.blockNumbersPopups.damage) {
					// eslint-disable-next-line no-magic-numbers
					event.value = BigInt(0);
					res = true;
				}
				return res;
			}
			else if (
				data.activeMode.blockHits && data.activeMode.blockHits.area && (tracker.spawnedPlayers.has(event.owner) || tracker.spawnedPlayers.has(event.source))
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

		const fontSwapHandler = () => {
			if (data.activeMode.blockNumbersPopups && data.activeMode.blockNumbersPopups.damage) return false;
		};

		const dropIfBlockedHandler = (event) => {
			let id = event.target || event.gameId;
			if (isEntityBlocked(id)) return false;
		};

		const actionStageHandler = (event) => {
			if (isEntityBlocked(event.gameId)) return false;
			if (isSkillBlockable(event)) return false;
		};

		const actionEndHandler = (event) => {
			if (isEntityBlocked(event.gameId)) return false;
		};

		const appearanceChangeHandler = (event) => {
			if (isEntityBlocked(event.gameId) || data.activeMode.blockCustomAppearanceChanges) return false;
		};

		const achievementHandler = () => {
			if (data.activeMode.blockAchievementsInCombat && meInCombat()) return false;
		};

		const baloonsHandler = (event) => {
			if (isEntityBlocked(event.source)) return false;
			if (data.activeMode.blockPetBaloons && tracker.spawnedServants.has(event.source)) return false;
		};

		const partyMemberListHandler = (event) => {
			partyMembers.clear();
			event.members.forEach(member => {
				if (!isMe(member.gameId))
					partyMembers.set(member.gameId, { "pid": member.playerId, "sid": member.serverId });
			});
			reconfigurePlayers();
		};

		const partyMemberDeleteHandler = (event) => {
			[...partyMembers.keys()].forEach(key => {
				let value = partyMembers.get(key);
				if (value["pid"] === event.playerId && value["sid"] === event.serverId) {
					partyMembers.delete(key);
				}
			});
			reconfigurePlayers();
		};

		const partyLeaveHandler = () => {
			partyMembers.clear();
			reconfigurePlayers();
		};

		const cleanup = () => {
			console.log("DEBUG: unitFps -> cleanup");
			blockedPlayers.clear();
			blockedNpcs.clear();
			blockedSummons.clear();
			blockedServants.clear();
			blockedDrop.clear();
		};

		//-------------------------------------
		// Hooks
		//-------------------------------------
		data.throttlePacketsData.forEach(packet => { mod.hook(packet, RAW_HOOK_MODE.PAYLOAD, HOOK_SETTINGS.LAST, throttlePacketsHandler.bind(null, packet)); });
		data.lockedPacketsData.forEach(packet => { mod.hook(packet, RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.LAST, blockUselessPacketsHandler); });
		mod.hook(...proto.getData("S_SYSTEM_MESSAGE"), HOOK_SETTINGS.LAST, smtHandler);
		mod.hook("C_SHOW_ITEMLIST", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.LAST, inventoryHandler);
		mod.hook("S_INVEN_USERDATA", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.LAST, inventoryHandler);
		mod.hook("S_ITEMLIST", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.LAST, inventoryHandler);
		mod.hook("S_UPDATE_ACHIEVEMENT_PROGRESS", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.LAST, achievementHandler);
		mod.hook("S_LOAD_TOPO", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.FIRST, cleanup);
		mod.hook(...proto.getData("S_QUEST_BALLOON"), HOOK_SETTINGS.LAST, baloonsHandler);
		
		mod.hook(...proto.getData("S_DESPAWN_COLLECTION"), HOOK_SETTINGS.LAST, collectionHandler.bind(null, ENTITY_HOOK_TYPE.DESPAWN));
		mod.hook(...proto.getData("S_SPAWN_COLLECTION"), HOOK_SETTINGS.LAST, collectionHandler.bind(null, ENTITY_HOOK_TYPE.SPAWN));
		mod.hook(...proto.getData("S_REQUEST_SPAWN_SERVANT"), HOOK_SETTINGS.LAST, servantsHandler.bind(null, ENTITY_HOOK_TYPE.SPAWN));
		mod.hook(...proto.getData("S_REQUEST_DESPAWN_SERVANT"), HOOK_SETTINGS.LAST, servantsHandler.bind(null, ENTITY_HOOK_TYPE.DESPAWN));
		mod.hook(...proto.getData("S_SPAWN_NPC"), HOOK_SETTINGS.LAST, npcHandler.bind(null, ENTITY_HOOK_TYPE.SPAWN));
		mod.hook(...proto.getData("S_DESPAWN_NPC"), HOOK_SETTINGS.LAST, npcHandler.bind(null, ENTITY_HOOK_TYPE.DESPAWN));
		mod.hook(...proto.getData("S_SPAWN_USER"), HOOK_SETTINGS.LAST, userHandler.bind(null, ENTITY_HOOK_TYPE.SPAWN));
		mod.hook(...proto.getData("S_DESPAWN_USER"), HOOK_SETTINGS.LAST, userHandler.bind(null, ENTITY_HOOK_TYPE.DESPAWN));
		mod.hook(...proto.getData("S_SPAWN_DROPITEM"), HOOK_SETTINGS.LAST, dropHandler.bind(null, ENTITY_HOOK_TYPE.SPAWN));
		mod.hook(...proto.getData("S_DESPAWN_DROPITEM"), HOOK_SETTINGS.LAST, dropHandler.bind(null, ENTITY_HOOK_TYPE.DESPAWN));

		mod.hook(...proto.getData("S_SOCIAL"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_USER_STATUS"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_USER_MOVETYPE"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_FEARMOVE_STAGE"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_FEARMOVE_END"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_USER_LOCATION"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_CREATURE_ROTATE"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_CREATURE_LIFE"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_NPC_LOCATION"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_MOUNT_VEHICLE"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_UNMOUNT_VEHICLE"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_STICK_TO_USER_START"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);
		mod.hook(...proto.getData("S_STICK_TO_USER_END"), HOOK_SETTINGS.LAST, dropIfBlockedHandler);

		mod.hook(...proto.getData("S_INSTANCE_ARROW"), HOOK_SETTINGS.LAST, blockAdditionalSkillEffectsHandler);
		mod.hook(...proto.getData("S_INSTANCE_ARROW"), HOOK_SETTINGS.LASTFAKE, blockAdditionalSkillEffectsHandler);
		mod.hook(...proto.getData("S_CREATURE_CHANGE_HP"), HOOK_SETTINGS.LAST, creatureChangeHpHandler);
		mod.hook(...proto.getData("S_PLAYER_CHANGE_MP"), HOOK_SETTINGS.LAST, creatureChangeMpHandler);
		mod.hook(...proto.getData("S_EACH_SKILL_RESULT"), HOOK_SETTINGS.LAST, eachSkillResultHandler);
		mod.hook("S_FONT_SWAP_INFO", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.LAST, fontSwapHandler);
		
		mod.hook(...proto.getData("S_ACTION_STAGE"), HOOK_SETTINGS.LAST, actionStageHandler);
		mod.hook(...proto.getData("S_ACTION_END"), HOOK_SETTINGS.LAST, actionEndHandler);
		
		mod.hook(...proto.getData("S_ABNORMALITY_BEGIN"), HOOK_SETTINGS.LAST, abnormalsHandler);
		mod.hook(...proto.getData("S_ABNORMALITY_END"), HOOK_SETTINGS.LAST, abnormalsHandler);
		mod.hook(...proto.getData("S_ABNORMALITY_FAIL"), HOOK_SETTINGS.LAST, abnormalsHandler);
		mod.hook(...proto.getData("S_ABNORMALITY_DAMAGE_ABSORB"), HOOK_SETTINGS.LAST, abnormalsHandler);
		//mod.hook(...proto.getData("S_ABNORMALITY_RESIST"), HOOK_SETTINGS.LAST, abnormalsHandler); //TODO: NEED MAP

		mod.hook(...proto.getData("S_SPAWN_PROJECTILE"), HOOK_SETTINGS.LAST, projectileHandler);
		mod.hook(...proto.getData("S_START_USER_PROJECTILE"), HOOK_SETTINGS.LAST, projectileHandler);
		mod.hook(...proto.getData("S_END_USER_PROJECTILE"), HOOK_SETTINGS.LAST, projectileHandler);
		mod.hook(...proto.getData("S_DESPAWN_PROJECTILE"), HOOK_SETTINGS.LAST, projectileHandler);

		mod.hook(...proto.getData("S_USER_APPEARANCE_CHANGE"), HOOK_SETTINGS.LAST, appearanceChangeHandler);
		mod.hook(...proto.getData("S_USER_EXTERNAL_CHANGE"), HOOK_SETTINGS.LAST, appearanceChangeHandler);
		mod.hook(...proto.getData("S_UNICAST_TRANSFORM_DATA"), HOOK_SETTINGS.LAST, appearanceChangeHandler);
		//mod.hook(...proto.getData("S_USER_CHANGE_FACE_CUSTOM"), HOOK_SETTINGS.LAST, appearanceChangeHandler); // TODO: NEED MAP

		mod.hook(...proto.getData("S_PARTY_MEMBER_LIST"), HOOK_SETTINGS.FIRSTA, partyMemberListHandler);
		mod.hook(...proto.getData("S_LEAVE_PARTY_MEMBER"), HOOK_SETTINGS.FIRSTA, partyMemberDeleteHandler);
		mod.hook(...proto.getData("S_BAN_PARTY_MEMBER"), HOOK_SETTINGS.FIRSTA, partyMemberDeleteHandler);
		mod.hook("S_LEAVE_PARTY", RAW_HOOK_MODE.EVENT, HOOK_SETTINGS.FIRSTA, partyLeaveHandler);

		deps.data.on(EVENTS.RECONFIGURE, () => {
			console.log("DEBUG: unitFps -> constructor -> reconfigureEvent");
			changeShakeState();
			reconfigureCollections();
			reconfigureDrop();
			reconfigurePlayers();
			reconfigureServants();
			reconfigureSummons();
			reconfigureNpcs();
		});

		deps.data.on(EVENTS.RECONFIGUREPARTIAL, () => {
			console.log("DEBUG: unitFps -> constructor -> reconfigurePartialEvent");
			changeShakeState();
		});
	}
}

module.exports = unitFps;