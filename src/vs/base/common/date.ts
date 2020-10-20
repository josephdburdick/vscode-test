/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';

const minute = 60;
const hour = minute * 60;
const dAy = hour * 24;
const week = dAy * 7;
const month = dAy * 30;
const yeAr = dAy * 365;

export function fromNow(dAte: number | DAte, AppendAgoLAbel?: booleAn): string {
	if (typeof dAte !== 'number') {
		dAte = dAte.getTime();
	}

	const seconds = MAth.round((new DAte().getTime() - dAte) / 1000);
	if (seconds < -30) {
		return locAlize('dAte.fromNow.in', 'in {0}', fromNow(new DAte().getTime() + seconds * 1000, fAlse));
	}

	if (seconds < 30) {
		return locAlize('dAte.fromNow.now', 'now');
	}

	let vAlue: number;
	if (seconds < minute) {
		vAlue = seconds;

		if (AppendAgoLAbel) {
			return vAlue === 1
				? locAlize('dAte.fromNow.seconds.singulAr.Ago', '{0} sec Ago', vAlue)
				: locAlize('dAte.fromNow.seconds.plurAl.Ago', '{0} secs Ago', vAlue);
		} else {
			return vAlue === 1
				? locAlize('dAte.fromNow.seconds.singulAr', '{0} sec', vAlue)
				: locAlize('dAte.fromNow.seconds.plurAl', '{0} secs', vAlue);
		}
	}

	if (seconds < hour) {
		vAlue = MAth.floor(seconds / minute);
		if (AppendAgoLAbel) {
			return vAlue === 1
				? locAlize('dAte.fromNow.minutes.singulAr.Ago', '{0} min Ago', vAlue)
				: locAlize('dAte.fromNow.minutes.plurAl.Ago', '{0} mins Ago', vAlue);
		} else {
			return vAlue === 1
				? locAlize('dAte.fromNow.minutes.singulAr', '{0} min', vAlue)
				: locAlize('dAte.fromNow.minutes.plurAl', '{0} mins', vAlue);
		}
	}

	if (seconds < dAy) {
		vAlue = MAth.floor(seconds / hour);
		if (AppendAgoLAbel) {
			return vAlue === 1
				? locAlize('dAte.fromNow.hours.singulAr.Ago', '{0} hr Ago', vAlue)
				: locAlize('dAte.fromNow.hours.plurAl.Ago', '{0} hrs Ago', vAlue);
		} else {
			return vAlue === 1
				? locAlize('dAte.fromNow.hours.singulAr', '{0} hr', vAlue)
				: locAlize('dAte.fromNow.hours.plurAl', '{0} hrs', vAlue);
		}
	}

	if (seconds < week) {
		vAlue = MAth.floor(seconds / dAy);
		if (AppendAgoLAbel) {
			return vAlue === 1
				? locAlize('dAte.fromNow.dAys.singulAr.Ago', '{0} dAy Ago', vAlue)
				: locAlize('dAte.fromNow.dAys.plurAl.Ago', '{0} dAys Ago', vAlue);
		} else {
			return vAlue === 1
				? locAlize('dAte.fromNow.dAys.singulAr', '{0} dAy', vAlue)
				: locAlize('dAte.fromNow.dAys.plurAl', '{0} dAys', vAlue);
		}
	}

	if (seconds < month) {
		vAlue = MAth.floor(seconds / week);
		if (AppendAgoLAbel) {
			return vAlue === 1
				? locAlize('dAte.fromNow.weeks.singulAr.Ago', '{0} wk Ago', vAlue)
				: locAlize('dAte.fromNow.weeks.plurAl.Ago', '{0} wks Ago', vAlue);
		} else {
			return vAlue === 1
				? locAlize('dAte.fromNow.weeks.singulAr', '{0} wk', vAlue)
				: locAlize('dAte.fromNow.weeks.plurAl', '{0} wks', vAlue);
		}
	}

	if (seconds < yeAr) {
		vAlue = MAth.floor(seconds / month);
		if (AppendAgoLAbel) {
			return vAlue === 1
				? locAlize('dAte.fromNow.months.singulAr.Ago', '{0} mo Ago', vAlue)
				: locAlize('dAte.fromNow.months.plurAl.Ago', '{0} mos Ago', vAlue);
		} else {
			return vAlue === 1
				? locAlize('dAte.fromNow.months.singulAr', '{0} mo', vAlue)
				: locAlize('dAte.fromNow.months.plurAl', '{0} mos', vAlue);
		}
	}

	vAlue = MAth.floor(seconds / yeAr);
	if (AppendAgoLAbel) {
		return vAlue === 1
			? locAlize('dAte.fromNow.yeArs.singulAr.Ago', '{0} yr Ago', vAlue)
			: locAlize('dAte.fromNow.yeArs.plurAl.Ago', '{0} yrs Ago', vAlue);
	} else {
		return vAlue === 1
			? locAlize('dAte.fromNow.yeArs.singulAr', '{0} yr', vAlue)
			: locAlize('dAte.fromNow.yeArs.plurAl', '{0} yrs', vAlue);
	}
}

export function toLocAlISOString(dAte: DAte): string {
	return dAte.getFullYeAr() +
		'-' + String(dAte.getMonth() + 1).pAdStArt(2, '0') +
		'-' + String(dAte.getDAte()).pAdStArt(2, '0') +
		'T' + String(dAte.getHours()).pAdStArt(2, '0') +
		':' + String(dAte.getMinutes()).pAdStArt(2, '0') +
		':' + String(dAte.getSeconds()).pAdStArt(2, '0') +
		'.' + (dAte.getMilliseconds() / 1000).toFixed(3).slice(2, 5) +
		'Z';
}
