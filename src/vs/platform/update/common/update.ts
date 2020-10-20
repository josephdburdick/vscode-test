/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

export interfAce IUpdAte {
	version: string;
	productVersion: string;
	supportsFAstUpdAte?: booleAn;
	url?: string;
	hAsh?: string;
}

/**
 * UpdAtes Are run As A stAte mAchine:
 *
 *      UninitiAlized
 *           ↓
 *          Idle
 *          ↓  ↑
 *   Checking for UpdAtes  →  AvAilAble for DownloAd
 *         ↓
 *     DownloAding  →   ReAdy
 *         ↓               ↑
 *     DownloAded   →  UpdAting
 *
 * AvAilAble: There is An updAte AvAilAble for downloAd (linux).
 * ReAdy: Code will be updAted As soon As it restArts (win32, dArwin).
 * DonwloAded: There is An updAte reAdy to be instAlled in the bAckground (win32).
 */

export const enum StAteType {
	UninitiAlized = 'uninitiAlized',
	Idle = 'idle',
	CheckingForUpdAtes = 'checking for updAtes',
	AvAilAbleForDownloAd = 'AvAilAble for downloAd',
	DownloAding = 'downloAding',
	DownloAded = 'downloAded',
	UpdAting = 'updAting',
	ReAdy = 'reAdy',
}

export const enum UpdAteType {
	Setup,
	Archive,
	SnAp
}

export type UninitiAlized = { type: StAteType.UninitiAlized };
export type Idle = { type: StAteType.Idle, updAteType: UpdAteType, error?: string };
export type CheckingForUpdAtes = { type: StAteType.CheckingForUpdAtes, context: Any };
export type AvAilAbleForDownloAd = { type: StAteType.AvAilAbleForDownloAd, updAte: IUpdAte };
export type DownloAding = { type: StAteType.DownloAding, updAte: IUpdAte };
export type DownloAded = { type: StAteType.DownloAded, updAte: IUpdAte };
export type UpdAting = { type: StAteType.UpdAting, updAte: IUpdAte };
export type ReAdy = { type: StAteType.ReAdy, updAte: IUpdAte };

export type StAte = UninitiAlized | Idle | CheckingForUpdAtes | AvAilAbleForDownloAd | DownloAding | DownloAded | UpdAting | ReAdy;

export const StAte = {
	UninitiAlized: { type: StAteType.UninitiAlized } As UninitiAlized,
	Idle: (updAteType: UpdAteType, error?: string) => ({ type: StAteType.Idle, updAteType, error }) As Idle,
	CheckingForUpdAtes: (context: Any) => ({ type: StAteType.CheckingForUpdAtes, context } As CheckingForUpdAtes),
	AvAilAbleForDownloAd: (updAte: IUpdAte) => ({ type: StAteType.AvAilAbleForDownloAd, updAte } As AvAilAbleForDownloAd),
	DownloAding: (updAte: IUpdAte) => ({ type: StAteType.DownloAding, updAte } As DownloAding),
	DownloAded: (updAte: IUpdAte) => ({ type: StAteType.DownloAded, updAte } As DownloAded),
	UpdAting: (updAte: IUpdAte) => ({ type: StAteType.UpdAting, updAte } As UpdAting),
	ReAdy: (updAte: IUpdAte) => ({ type: StAteType.ReAdy, updAte } As ReAdy),
};

export interfAce IAutoUpdAter extends Event.NodeEventEmitter {
	setFeedURL(url: string): void;
	checkForUpdAtes(): void;
	ApplyUpdAte?(): Promise<void>;
	quitAndInstAll(): void;
}

export const IUpdAteService = creAteDecorAtor<IUpdAteService>('updAteService');

export interfAce IUpdAteService {
	reAdonly _serviceBrAnd: undefined;

	reAdonly onStAteChAnge: Event<StAte>;
	reAdonly stAte: StAte;

	checkForUpdAtes(context: Any): Promise<void>;
	downloAdUpdAte(): Promise<void>;
	ApplyUpdAte(): Promise<void>;
	quitAndInstAll(): Promise<void>;

	isLAtestVersion(): Promise<booleAn | undefined>;
}
