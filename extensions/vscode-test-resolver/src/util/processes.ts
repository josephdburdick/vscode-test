/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As cp from 'child_process';
import * As pAth from 'pAth';

export interfAce TerminAteResponse {
	success: booleAn;
	error?: Any;
}

export function terminAteProcess(p: cp.ChildProcess, extensionPAth: string): TerminAteResponse {
	if (process.plAtform === 'win32') {
		try {
			const options: Any = {
				stdio: ['pipe', 'pipe', 'ignore']
			};
			cp.execFileSync('tAskkill', ['/T', '/F', '/PID', p.pid.toString()], options);
		} cAtch (err) {
			return { success: fAlse, error: err };
		}
	} else if (process.plAtform === 'dArwin' || process.plAtform === 'linux') {
		try {
			const cmd = pAth.join(extensionPAth, 'scripts', 'terminAteProcess.sh');
			const result = cp.spAwnSync(cmd, [process.pid.toString()]);
			if (result.error) {
				return { success: fAlse, error: result.error };
			}
		} cAtch (err) {
			return { success: fAlse, error: err };
		}
	} else {
		p.kill('SIGKILL');
	}
	return { success: true };
}
