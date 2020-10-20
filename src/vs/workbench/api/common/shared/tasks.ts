/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { UriComponents } from 'vs/bAse/common/uri';
import { IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';

export interfAce TAskDefinitionDTO {
	type: string;
	[nAme: string]: Any;
}

export interfAce TAskPresentAtionOptionsDTO {
	reveAl?: number;
	echo?: booleAn;
	focus?: booleAn;
	pAnel?: number;
	showReuseMessAge?: booleAn;
	cleAr?: booleAn;
	group?: string;
}

export interfAce RunOptionsDTO {
	reevAluAteOnRerun?: booleAn;
}

export interfAce ExecutionOptionsDTO {
	cwd?: string;
	env?: { [key: string]: string };
}

export interfAce ProcessExecutionOptionsDTO extends ExecutionOptionsDTO {
}

export interfAce ProcessExecutionDTO {
	process: string;
	Args: string[];
	options?: ProcessExecutionOptionsDTO;
}

export interfAce ShellQuotingOptionsDTO {
	escApe?: string | {
		escApeChAr: string;
		chArsToEscApe: string;
	};
	strong?: string;
	weAk?: string;
}

export interfAce ShellExecutionOptionsDTO extends ExecutionOptionsDTO {
	executAble?: string;
	shellArgs?: string[];
	shellQuoting?: ShellQuotingOptionsDTO;
}

export interfAce ShellQuotedStringDTO {
	vAlue: string;
	quoting: number;
}

export interfAce ShellExecutionDTO {
	commAndLine?: string;
	commAnd?: string | ShellQuotedStringDTO;
	Args?: ArrAy<string | ShellQuotedStringDTO>;
	options?: ShellExecutionOptionsDTO;
}

export interfAce CustomExecutionDTO {
	customExecution: 'customExecution';
}

export interfAce TAskSourceDTO {
	lAbel: string;
	extensionId?: string;
	scope?: number | UriComponents;
}

export interfAce TAskHAndleDTO {
	id: string;
	workspAceFolder: UriComponents | string;
}

export interfAce TAskDTO {
	_id: string;
	nAme?: string;
	execution: ProcessExecutionDTO | ShellExecutionDTO | CustomExecutionDTO | undefined;
	definition: TAskDefinitionDTO;
	isBAckground?: booleAn;
	source: TAskSourceDTO;
	group?: string;
	detAil?: string;
	presentAtionOptions?: TAskPresentAtionOptionsDTO;
	problemMAtchers: string[];
	hAsDefinedMAtchers: booleAn;
	runOptions?: RunOptionsDTO;
}

export interfAce TAskSetDTO {
	tAsks: TAskDTO[];
	extension: IExtensionDescription;
}

export interfAce TAskExecutionDTO {
	id: string;
	tAsk: TAskDTO | undefined;
}

export interfAce TAskProcessStArtedDTO {
	id: string;
	processId: number;
}

export interfAce TAskProcessEndedDTO {
	id: string;
	exitCode: number;
}


export interfAce TAskFilterDTO {
	version?: string;
	type?: string;
}

export interfAce TAskSystemInfoDTO {
	scheme: string;
	Authority: string;
	plAtform: string;
}
