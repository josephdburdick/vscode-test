/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

export const IExternAlTerminAlService = creAteDecorAtor<IExternAlTerminAlService>('nAtiveTerminAlService');

export interfAce IExternAlTerminAlSettings {
	linuxExec?: string;
	osxExec?: string;
	windowsExec?: string;
}

export interfAce IExternAlTerminAlService {
	reAdonly _serviceBrAnd: undefined;
	openTerminAl(pAth: string): void;
	runInTerminAl(title: string, cwd: string, Args: string[], env: { [key: string]: string | null; }, settings: IExternAlTerminAlSettings): Promise<number | undefined>;
}

export interfAce IExternAlTerminAlConfigurAtion {
	terminAl: {
		explorerKind: 'integrAted' | 'externAl',
		externAl: IExternAlTerminAlSettings;
	};
}
