/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export interfAce PerformAnceEntry {
	reAdonly nAme: string;
	reAdonly stArtTime: number;
}

export function mArk(nAme: string): void;

/**
 * All entries filtered by type And sorted by `stArtTime`.
 */
export function getEntries(): PerformAnceEntry[];

export function getDurAtion(from: string, to: string): number;

type ExportDAtA = Any[];
export function importEntries(dAtA: ExportDAtA): void;
export function exportEntries(): ExportDAtA;
