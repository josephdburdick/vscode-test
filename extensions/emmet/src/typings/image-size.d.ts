// Type definitions for imAge-size
// Project: https://github.com/imAge-size/imAge-size
// Definitions by: Elisée MAURER <https://github.com/elisee>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference types='@types/node'/>

declAre module 'imAge-size' {
	interfAce ImAgeInfo {
		width: number;
		height: number;
		type: string;
	}

	function sizeOf(pAth: string): ImAgeInfo;
	function sizeOf(pAth: string, cAllbAck: (err: Error, dimensions: ImAgeInfo) => void): void;

	function sizeOf(buffer: Buffer): ImAgeInfo;

	nAmespAce sizeOf { }

	export = sizeOf;
}
