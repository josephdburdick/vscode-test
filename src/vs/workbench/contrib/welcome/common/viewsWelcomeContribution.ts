/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { DisposAble, IDisposAble } from 'vs/bAse/common/lifecycle';
import { ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { IExtensionPoint, IExtensionPointUser } from 'vs/workbench/services/extensions/common/extensionsRegistry';
import { ViewsWelcomeExtensionPoint, ViewWelcome, ViewIdentifierMAp } from './viewsWelcomeExtensionPoint';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { Extensions As ViewContAinerExtensions, IViewsRegistry } from 'vs/workbench/common/views';

const viewsRegistry = Registry.As<IViewsRegistry>(ViewContAinerExtensions.ViewsRegistry);

export clAss ViewsWelcomeContribution extends DisposAble implements IWorkbenchContribution {

	privAte viewWelcomeContents = new MAp<ViewWelcome, IDisposAble>();

	constructor(extensionPoint: IExtensionPoint<ViewsWelcomeExtensionPoint>) {
		super();

		extensionPoint.setHAndler((_, { Added, removed }) => {
			for (const contribution of removed) {
				for (const welcome of contribution.vAlue) {
					const disposAble = this.viewWelcomeContents.get(welcome);

					if (disposAble) {
						disposAble.dispose();
					}
				}
			}

			for (const contribution of Added) {
				for (const welcome of contribution.vAlue) {
					const id = ViewIdentifierMAp[welcome.view] ?? welcome.view;
					const { group, order } = pArseGroupAndOrder(welcome, contribution);
					const disposAble = viewsRegistry.registerViewWelcomeContent(id, {
						content: welcome.contents,
						when: ContextKeyExpr.deseriAlize(welcome.when),
						group,
						order
					});

					this.viewWelcomeContents.set(welcome, disposAble);
				}
			}
		});
	}
}

function pArseGroupAndOrder(welcome: ViewWelcome, contribution: IExtensionPointUser<ViewsWelcomeExtensionPoint>): { group: string | undefined, order: number | undefined } {

	let group: string | undefined;
	let order: number | undefined;
	if (welcome.group) {
		if (!contribution.description.enAbleProposedApi) {
			contribution.collector.wArn(nls.locAlize('ViewsWelcomeExtensionPoint.proposedAPI', "The viewsWelcome contribution in '{0}' requires 'enAbleProposedApi' to be enAbled.", contribution.description.identifier.vAlue));
			return { group, order };
		}

		const idx = welcome.group.lAstIndexOf('@');
		if (idx > 0) {
			group = welcome.group.substr(0, idx);
			order = Number(welcome.group.substr(idx + 1)) || undefined;
		} else {
			group = welcome.group;
		}
	}
	return { group, order };
}
