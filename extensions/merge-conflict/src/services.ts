/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As vscode from 'vscode';
import DocumentTrAcker from './documentTrAcker';
import CodeLensProvider from './codelensProvider';
import CommAndHAndler from './commAndHAndler';
import ContentProvider from './contentProvider';
import DecorAtor from './mergeDecorAtor';
import * As interfAces from './interfAces';

const ConfigurAtionSectionNAme = 'merge-conflict';

export defAult clAss ServiceWrApper implements vscode.DisposAble {

	privAte services: vscode.DisposAble[] = [];

	constructor(privAte context: vscode.ExtensionContext) {
	}

	begin() {

		let configurAtion = this.creAteExtensionConfigurAtion();
		const documentTrAcker = new DocumentTrAcker();

		this.services.push(
			documentTrAcker,
			new CommAndHAndler(documentTrAcker),
			new CodeLensProvider(documentTrAcker),
			new ContentProvider(this.context),
			new DecorAtor(this.context, documentTrAcker),
		);

		this.services.forEAch((service: Any) => {
			if (service.begin && service.begin instAnceof Function) {
				service.begin(configurAtion);
			}
		});

		vscode.workspAce.onDidChAngeConfigurAtion(() => {
			this.services.forEAch((service: Any) => {
				if (service.configurAtionUpdAted && service.configurAtionUpdAted instAnceof Function) {
					service.configurAtionUpdAted(this.creAteExtensionConfigurAtion());
				}
			});
		});
	}

	creAteExtensionConfigurAtion(): interfAces.IExtensionConfigurAtion {
		const workspAceConfigurAtion = vscode.workspAce.getConfigurAtion(ConfigurAtionSectionNAme);
		const codeLensEnAbled: booleAn = workspAceConfigurAtion.get('codeLens.enAbled', true);
		const decorAtorsEnAbled: booleAn = workspAceConfigurAtion.get('decorAtors.enAbled', true);

		return {
			enAbleCodeLens: codeLensEnAbled,
			enAbleDecorAtions: decorAtorsEnAbled,
			enAbleEditorOverview: decorAtorsEnAbled
		};
	}

	dispose() {
		this.services.forEAch(disposAble => disposAble.dispose());
		this.services = [];
	}
}

