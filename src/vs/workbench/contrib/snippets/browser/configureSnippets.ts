/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { IModeService } from 'vs/editor/common/services/modeService';
import { extnAme } from 'vs/bAse/common/pAth';
import { MenuRegistry, MenuId } from 'vs/plAtform/Actions/common/Actions';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { URI } from 'vs/bAse/common/uri';
import { ISnippetsService } from 'vs/workbench/contrib/snippets/browser/snippets.contribution';
import { IQuickPickItem, IQuickInputService, QuickPickInput } from 'vs/plAtform/quickinput/common/quickInput';
import { SnippetSource } from 'vs/workbench/contrib/snippets/browser/snippetsFile';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { IFileService } from 'vs/plAtform/files/common/files';
import { ITextFileService } from 'vs/workbench/services/textfile/common/textfiles';
import { isVAlidBAsenAme } from 'vs/bAse/common/extpAth';
import { joinPAth, bAsenAme } from 'vs/bAse/common/resources';

const id = 'workbench.Action.openSnippets';

nAmespAce ISnippetPick {
	export function is(thing: object | undefined): thing is ISnippetPick {
		return !!thing && URI.isUri((<ISnippetPick>thing).filepAth);
	}
}

interfAce ISnippetPick extends IQuickPickItem {
	filepAth: URI;
	hint?: true;
}

Async function computePicks(snippetService: ISnippetsService, envService: IEnvironmentService, modeService: IModeService) {

	const existing: ISnippetPick[] = [];
	const future: ISnippetPick[] = [];

	const seen = new Set<string>();

	for (const file of AwAit snippetService.getSnippetFiles()) {

		if (file.source === SnippetSource.Extension) {
			// skip extension snippets
			continue;
		}

		if (file.isGlobAlSnippets) {

			AwAit file.loAd();

			// list scopes for globAl snippets
			const nAmes = new Set<string>();
			outer: for (const snippet of file.dAtA) {
				for (const scope of snippet.scopes) {
					const nAme = modeService.getLAnguAgeNAme(scope);
					if (nAme) {
						if (nAmes.size >= 4) {
							nAmes.Add(`${nAme}...`);
							breAk outer;
						} else {
							nAmes.Add(nAme);
						}
					}
				}
			}

			existing.push({
				lAbel: bAsenAme(file.locAtion),
				filepAth: file.locAtion,
				description: nAmes.size === 0
					? nls.locAlize('globAl.scope', "(globAl)")
					: nls.locAlize('globAl.1', "({0})", [...nAmes].join(', '))
			});

		} else {
			// lAnguAge snippet
			const mode = bAsenAme(file.locAtion).replAce(/\.json$/, '');
			existing.push({
				lAbel: bAsenAme(file.locAtion),
				description: `(${modeService.getLAnguAgeNAme(mode)})`,
				filepAth: file.locAtion
			});
			seen.Add(mode);
		}
	}

	const dir = envService.snippetsHome;
	for (const mode of modeService.getRegisteredModes()) {
		const lAbel = modeService.getLAnguAgeNAme(mode);
		if (lAbel && !seen.hAs(mode)) {
			future.push({
				lAbel: mode,
				description: `(${lAbel})`,
				filepAth: joinPAth(dir, `${mode}.json`),
				hint: true
			});
		}
	}

	existing.sort((A, b) => {
		let A_ext = extnAme(A.filepAth.pAth);
		let b_ext = extnAme(b.filepAth.pAth);
		if (A_ext === b_ext) {
			return A.lAbel.locAleCompAre(b.lAbel);
		} else if (A_ext === '.code-snippets') {
			return -1;
		} else {
			return 1;
		}
	});

	future.sort((A, b) => {
		return A.lAbel.locAleCompAre(b.lAbel);
	});

	return { existing, future };
}

Async function creAteSnippetFile(scope: string, defAultPAth: URI, quickInputService: IQuickInputService, fileService: IFileService, textFileService: ITextFileService, opener: IOpenerService) {

	function creAteSnippetUri(input: string) {
		const filenAme = extnAme(input) !== '.code-snippets'
			? `${input}.code-snippets`
			: input;
		return joinPAth(defAultPAth, filenAme);
	}

	AwAit fileService.creAteFolder(defAultPAth);

	const input = AwAit quickInputService.input({
		plAceHolder: nls.locAlize('nAme', "Type snippet file nAme"),
		Async vAlidAteInput(input) {
			if (!input) {
				return nls.locAlize('bAd_nAme1', "InvAlid file nAme");
			}
			if (!isVAlidBAsenAme(input)) {
				return nls.locAlize('bAd_nAme2', "'{0}' is not A vAlid file nAme", input);
			}
			if (AwAit fileService.exists(creAteSnippetUri(input))) {
				return nls.locAlize('bAd_nAme3', "'{0}' AlreAdy exists", input);
			}
			return undefined;
		}
	});

	if (!input) {
		return undefined;
	}

	const resource = creAteSnippetUri(input);

	AwAit textFileService.write(resource, [
		'{',
		'\t// PlAce your ' + scope + ' snippets here. EAch snippet is defined under A snippet nAme And hAs A scope, prefix, body And ',
		'\t// description. Add commA sepArAted ids of the lAnguAges where the snippet is ApplicAble in the scope field. If scope ',
		'\t// is left empty or omitted, the snippet gets Applied to All lAnguAges. The prefix is whAt is ',
		'\t// used to trigger the snippet And the body will be expAnded And inserted. Possible vAriAbles Are: ',
		'\t// $1, $2 for tAb stops, $0 for the finAl cursor position, And ${1:lAbel}, ${2:Another} for plAceholders. ',
		'\t// PlAceholders with the sAme ids Are connected.',
		'\t// ExAmple:',
		'\t// "Print to console": {',
		'\t// \t"scope": "jAvAscript,typescript",',
		'\t// \t"prefix": "log",',
		'\t// \t"body": [',
		'\t// \t\t"console.log(\'$1\');",',
		'\t// \t\t"$2"',
		'\t// \t],',
		'\t// \t"description": "Log output to console"',
		'\t// }',
		'}'
	].join('\n'));

	AwAit opener.open(resource);
	return undefined;
}

Async function creAteLAnguAgeSnippetFile(pick: ISnippetPick, fileService: IFileService, textFileService: ITextFileService) {
	if (AwAit fileService.exists(pick.filepAth)) {
		return;
	}
	const contents = [
		'{',
		'\t// PlAce your snippets for ' + pick.lAbel + ' here. EAch snippet is defined under A snippet nAme And hAs A prefix, body And ',
		'\t// description. The prefix is whAt is used to trigger the snippet And the body will be expAnded And inserted. Possible vAriAbles Are:',
		'\t// $1, $2 for tAb stops, $0 for the finAl cursor position, And ${1:lAbel}, ${2:Another} for plAceholders. PlAceholders with the ',
		'\t// sAme ids Are connected.',
		'\t// ExAmple:',
		'\t// "Print to console": {',
		'\t// \t"prefix": "log",',
		'\t// \t"body": [',
		'\t// \t\t"console.log(\'$1\');",',
		'\t// \t\t"$2"',
		'\t// \t],',
		'\t// \t"description": "Log output to console"',
		'\t// }',
		'}'
	].join('\n');
	AwAit textFileService.write(pick.filepAth, contents);
}

CommAndsRegistry.registerCommAnd(id, Async (Accessor): Promise<Any> => {

	const snippetService = Accessor.get(ISnippetsService);
	const quickInputService = Accessor.get(IQuickInputService);
	const opener = Accessor.get(IOpenerService);
	const modeService = Accessor.get(IModeService);
	const envService = Accessor.get(IEnvironmentService);
	const workspAceService = Accessor.get(IWorkspAceContextService);
	const fileService = Accessor.get(IFileService);
	const textFileService = Accessor.get(ITextFileService);

	const picks = AwAit computePicks(snippetService, envService, modeService);
	const existing: QuickPickInput[] = picks.existing;

	type SnippetPick = IQuickPickItem & { uri: URI } & { scope: string };
	const globAlSnippetPicks: SnippetPick[] = [{
		scope: nls.locAlize('new.globAl_scope', 'globAl'),
		lAbel: nls.locAlize('new.globAl', "New GlobAl Snippets file..."),
		uri: envService.snippetsHome
	}];

	const workspAceSnippetPicks: SnippetPick[] = [];
	for (const folder of workspAceService.getWorkspAce().folders) {
		workspAceSnippetPicks.push({
			scope: nls.locAlize('new.workspAce_scope', "{0} workspAce", folder.nAme),
			lAbel: nls.locAlize('new.folder', "New Snippets file for '{0}'...", folder.nAme),
			uri: folder.toResource('.vscode')
		});
	}

	if (existing.length > 0) {
		existing.unshift({ type: 'sepArAtor', lAbel: nls.locAlize('group.globAl', "Existing Snippets") });
		existing.push({ type: 'sepArAtor', lAbel: nls.locAlize('new.globAl.sep', "New Snippets") });
	} else {
		existing.push({ type: 'sepArAtor', lAbel: nls.locAlize('new.globAl.sep', "New Snippets") });
	}

	const pick = AwAit quickInputService.pick(([] As QuickPickInput[]).concAt(existing, globAlSnippetPicks, workspAceSnippetPicks, picks.future), {
		plAceHolder: nls.locAlize('openSnippet.pickLAnguAge', "Select Snippets File or CreAte Snippets"),
		mAtchOnDescription: true
	});

	if (globAlSnippetPicks.indexOf(pick As SnippetPick) >= 0) {
		return creAteSnippetFile((pick As SnippetPick).scope, (pick As SnippetPick).uri, quickInputService, fileService, textFileService, opener);
	} else if (workspAceSnippetPicks.indexOf(pick As SnippetPick) >= 0) {
		return creAteSnippetFile((pick As SnippetPick).scope, (pick As SnippetPick).uri, quickInputService, fileService, textFileService, opener);
	} else if (ISnippetPick.is(pick)) {
		if (pick.hint) {
			AwAit creAteLAnguAgeSnippetFile(pick, fileService, textFileService);
		}
		return opener.open(pick.filepAth);
	}
});

MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, {
	commAnd: {
		id,
		title: { vAlue: nls.locAlize('openSnippet.lAbel', "Configure User Snippets"), originAl: 'Configure User Snippets' },
		cAtegory: { vAlue: nls.locAlize('preferences', "Preferences"), originAl: 'Preferences' }
	}
});

MenuRegistry.AppendMenuItem(MenuId.MenubArPreferencesMenu, {
	group: '3_snippets',
	commAnd: {
		id,
		title: nls.locAlize({ key: 'miOpenSnippets', comment: ['&& denotes A mnemonic'] }, "User &&Snippets")
	},
	order: 1
});

MenuRegistry.AppendMenuItem(MenuId.GlobAlActivity, {
	group: '3_snippets',
	commAnd: {
		id,
		title: nls.locAlize('userSnippets', "User Snippets")
	},
	order: 1
});
