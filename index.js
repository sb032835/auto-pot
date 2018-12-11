const path = require('path'); const fs = require('fs');
module.exports = function AutoPOT(mod) {
	const cmd = mod.command || mod.require.command;
	let config = getConfig(), hpPot = getHP(), mpPot = getMP();
	let getInv = false, useCombat = false, isSlaying = false, nowHP = 0, nowMP = 0;

	cmd.add(['autopot', 'pot'], (arg1, arg2) => {
		if(arg1 && arg1.length > 0) arg1 = arg1.toLowerCase();
		if(arg2 && arg2.length > 0) arg2 = arg2.toLowerCase();
		switch (arg1) {
			case 'id':
			case 'getid':
			case 'itemid':
				let getId = arg2.match(/#(\d*)@/);
				getId = getId ? Number(getId[1]) : 0;
				msg(`itemId: ${getId}.`);
				break;
			case 'load':
			case 'reload':
				switch(arg2) {
					case 'hp': hpPot = getHP(); msg(`[HP.json] <font color="#FFF380">重新加載.`); break;
					case 'mp': mpPot = getMP(); msg(`[MP.json] <font color="#FFF380">重新加載.`); break;
					case 'config': config = getConfig(); msg(`[設置] <font color="#FFF380">重新加載.`); break;
				}
				break;
			case 'notice':
				config.notice = !config.notice;
				msg(`${config.notice ? '<font color="#56B4E9">[開啟]' : '<font color="#E69F00">[關閉]'}`);
				break;
			case 'slay':
			case 'slaying':
				isSlaying = !isSlaying;
				msg(`壓血模式${isSlaying ? '<font color="#56B4E9">[開啟]' : '<font color="#E69F00">[關閉]</font>'} ${config.hp ? '' : 'HP 藥水<font color="#56B4E9">[開啟]'}`);
				if (!config.hp) config.hp = true;
				break;
			case 'hp':
				config.hp = !config.hp;
				msg(`HP 藥水 ${config.hp ? '<font color="#56B4E9">[開啟]' : '<font color="#E69F00">[關閉]'} ${isSlaying ? '壓血模式<font color="#E69F00">[關閉]' : ''}`);
				if (isSlaying) isSlaying = false;
				break;
			case 'mp':
			case 'mana':
				config.mp = !config.mp;
				msg(`MP 藥水${config.mp ? '<font color="#56B4E9">[開啟]' : '<font color="#E69F00">[關閉]'}`);
				break;
			default:
				msg(`<font color="#FF0000">指令錯誤</font>`);
				break;
		}
	});
	
	mod.hook('S_INVEN', 16, e => {
		if (config.enabled) {
			let gHP = null, gMP = null;
			for(let i = 0; i < hpPot.length; i++) {
				gHP = e.items.find(item => item.id === Number(hpPot[i][0]));
				if (gHP) hpPot[i][1].amount = gHP.amount;
			}
			for(let i = 0; i < mpPot.length; i++) {
				gMP = e.items.find(item => item.id === Number(mpPot[i][0]));
				if (gMP) mpPot[i][1].amount = gMP.amount;
			}
		}
	});
	
    mod.hook('S_PLAYER_STAT_UPDATE', 10, e => {
		if (config.enabled && config.hp) {
			nowHP = Math.round(parseInt(e.hp) / parseInt(e.maxHp) * 100);
			for (let hp = 0; hp < hpPot.length; hp++) {
				useCombat = hpPot[hp][1].inCombat ? mod.game.me.inCombat : true;
				if (!hpPot[hp][1].inCd && ((!isSlaying && nowHP <= hpPot[hp][1].use_at && useCombat) || (isSlaying && nowHP <= hpPot[hp][1].slay_at && mod.game.me.inCombat)) && hpPot[hp][1].amount > 0 && mod.game.me.alive && !mod.game.me.inBattleground && !mod.game.contract.active && !mod.game.me.mounted) {
					useItem(hpPot[hp]); hpPot[hp][1].inCd = true; hpPot[hp][1].amount--; setTimeout(function () {hpPot[hp][1].inCd = false;}, hpPot[hp][1].cd * 1000);
					if (config.notice) msg(`Used ${hpPot[hp][1].name}, still have ${(hpPot[hp][1].amount)} left.`);
				}
			}
		}
		if (config.enabled && config.mp) {
			nowMP = Math.round(parseInt(e.mp) / parseInt(e.maxMp) * 100);
			for (let mp = 0; mp < mpPot.length; mp++) {
				useCombat = mpPot[mp][1].inCombat ? mod.game.me.inCombat : true;
				if (!mpPot[mp][1].inCd && nowMP <= mpPot[mp][1].use_at && mpPot[mp][1].amount > 0 && mod.game.me.alive && useCombat && !mod.game.me.inBattleground && !mod.game.contract.active && !mod.game.me.mounted) {
					useItem(mpPot[mp]); mpPot[mp][1].inCd = true; mpPot[mp][1].amount--; setTimeout(function () {mpPot[mp][1].inCd = false;}, mpPot[mp][1].cd * 1000);
					if (config.notice) msg(`Used ${mpPot[mp][1].name}, still have ${(mpPot[mp][1].amount)} left.`);
				}
			}
		}
    });

	function useItem(itemId) {
		mod.send('C_USE_ITEM', 3, {
			gameId: mod.game.me.gameId,
			id: Number(itemId[0]),
			amount: 1,
			unk4: true
		});
	}
	
	function getConfig() {
		let data = {};
		try {
			data = require('./config.json');
		} catch (e) {
			data = {
				enabled: true,
				hp: false,
				mp: true,
				notice: false
			}
			jsonSave('config.json', data);
		}
		return data;
	}
	
	function getHP() {
		let data = {};
		try {
			data = require('./hp.json');
		} catch (e) {
			data[6552] = {
				name: 'Prime Recovery Potable',
				inCombat: true,
				use_at: 80,
				slay_at: 30,
				cd: 10
			}
			jsonSave('hp.json', data);
		}
		return jsonSort(data, 'use_at');
	}
	
	function getMP() {
		let data = {};
		try {
			data = require('./mp.json');
		} catch (e) {
			data[6562] = {
				name: 'Prime Replenishment Potable',
				inCombat: false,
				use_at: 50,
				cd: 10
			}
			jsonSave('mp.json', data);
		}
		return jsonSort(data, 'use_at');
	}
	
	function jsonSort(data, sortby){
		let key = Object.keys(data).sort(function(a,b) {return parseFloat(data[b][sortby]) - parseFloat(data[a][sortby])});
		let s2a = []; for(let i = 0; i < key.length; i++) s2a.push([key[i], data[key[i]]]);
		return s2a;
	}
	
	function msg(msg) {cmd.message(msg);}
	
	function jsonSave(name,data) {fs.writeFile(path.join(__dirname, name), JSON.stringify(data, null, 4), err => {});}
}
