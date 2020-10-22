/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { DisposaBle, IDisposaBle } from 'vs/Base/common/lifecycle';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { IExtensionPoint, IExtensionPointUser } from 'vs/workBench/services/extensions/common/extensionsRegistry';
import { ViewsWelcomeExtensionPoint, ViewWelcome, ViewIdentifierMap } from './viewsWelcomeExtensionPoint';
import { Registry } from 'vs/platform/registry/common/platform';
import { Extensions as ViewContainerExtensions, IViewsRegistry } from 'vs/workBench/common/views';

const viewsRegistry = Registry.as<IViewsRegistry>(ViewContainerExtensions.ViewsRegistry);

export class ViewsWelcomeContriBution extends DisposaBle implements IWorkBenchContriBution {

	private viewWelcomeContents = new Map<ViewWelcome, IDisposaBle>();

	constructor(extensionPoint: IExtensionPoint<ViewsWelcomeExtensionPoint>) {
		super();

		extensionPoint.setHandler((_, { added, removed }) => {
			for (const contriBution of removed) {
				for (const welcome of contriBution.value) {
					const disposaBle = this.viewWelcomeContents.get(welcome);

					if (disposaBle) {
						disposaBle.dispose();
					}
				}
			}

			for (const contriBution of added) {
				for (const welcome of contriBution.value) {
					const id = ViewIdentifierMap[welcome.view] ?? welcome.view;
					const { group, order } = parseGroupAndOrder(welcome, contriBution);
					const disposaBle = viewsRegistry.registerViewWelcomeContent(id, {
						content: welcome.contents,
						when: ContextKeyExpr.deserialize(welcome.when),
						group,
						order
					});

					this.viewWelcomeContents.set(welcome, disposaBle);
				}
			}
		});
	}
}

function parseGroupAndOrder(welcome: ViewWelcome, contriBution: IExtensionPointUser<ViewsWelcomeExtensionPoint>): { group: string | undefined, order: numBer | undefined } {

	let group: string | undefined;
	let order: numBer | undefined;
	if (welcome.group) {
		if (!contriBution.description.enaBleProposedApi) {
			contriBution.collector.warn(nls.localize('ViewsWelcomeExtensionPoint.proposedAPI', "The viewsWelcome contriBution in '{0}' requires 'enaBleProposedApi' to Be enaBled.", contriBution.description.identifier.value));
			return { group, order };
		}

		const idx = welcome.group.lastIndexOf('@');
		if (idx > 0) {
			group = welcome.group.suBstr(0, idx);
			order = NumBer(welcome.group.suBstr(idx + 1)) || undefined;
		} else {
			group = welcome.group;
		}
	}
	return { group, order };
}
