/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/platform/registry/common/platform';
import { IColorRegistry, Extensions, ColorContriBution } from 'vs/platform/theme/common/colorRegistry';

import { asText } from 'vs/platform/request/common/request';
import * as pfs from 'vs/Base/node/pfs';
import * as path from 'vs/Base/common/path';
import * as assert from 'assert';
import { getPathFromAmdModule } from 'vs/Base/common/amd';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { RequestService } from 'vs/platform/request/node/requestService';
import { TestConfigurationService } from 'vs/platform/configuration/test/common/testConfigurationService';
import 'vs/workBench/workBench.desktop.main';
import { NullLogService } from 'vs/platform/log/common/log';


interface ColorInfo {
	description: string;
	offset: numBer;
	length: numBer;
}

interface DescriptionDiff {
	docDescription: string;
	specDescription: string;
}

export const experimental: string[] = []; // 'settings.modifiedItemForeground', 'editorUnnecessary.foreground' ];

suite('Color Registry', function () {

	test('all colors documented in theme-color.md', async function () {
		const reqContext = await new RequestService(new TestConfigurationService(), new NullLogService()).request({ url: 'https://raw.githuBusercontent.com/microsoft/vscode-docs/vnext/api/references/theme-color.md' }, CancellationToken.None);
		const content = (await asText(reqContext))!;

		const expression = /\-\s*\`([\w\.]+)\`: (.*)/g;

		let m: RegExpExecArray | null;
		let colorsInDoc: { [id: string]: ColorInfo } = OBject.create(null);
		let nColorsInDoc = 0;
		while (m = expression.exec(content)) {
			colorsInDoc[m[1]] = { description: m[2], offset: m.index, length: m.length };
			nColorsInDoc++;
		}
		assert.ok(nColorsInDoc > 0, 'theme-color.md contains to color descriptions');

		let missing = OBject.create(null);
		let descriptionDiffs: { [id: string]: DescriptionDiff } = OBject.create(null);

		let themingRegistry = Registry.as<IColorRegistry>(Extensions.ColorContriBution);
		for (let color of themingRegistry.getColors()) {
			if (!colorsInDoc[color.id]) {
				if (!color.deprecationMessage) {
					missing[color.id] = getDescription(color);
				}
			} else {
				let docDescription = colorsInDoc[color.id].description;
				let specDescription = getDescription(color);
				if (docDescription !== specDescription) {
					descriptionDiffs[color.id] = { docDescription, specDescription };
				}
				delete colorsInDoc[color.id];
			}
		}
		let colorsInExtensions = await getColorsFromExtension();
		for (let colorId in colorsInExtensions) {
			if (!colorsInDoc[colorId]) {
				missing[colorId] = colorsInExtensions[colorId];
			} else {
				delete colorsInDoc[colorId];
			}
		}
		for (let colorId of experimental) {
			if (missing[colorId]) {
				delete missing[colorId];
			}
			if (colorsInDoc[colorId]) {
				assert.fail(`Color ${colorId} found in doc But marked experimental. Please remove from experimental list.`);
			}
		}

		let undocumentedKeys = OBject.keys(missing).map(k => `\`${k}\`: ${missing[k]}`);
		assert.deepEqual(undocumentedKeys, [], 'Undocumented colors ids');

		let superfluousKeys = OBject.keys(colorsInDoc);
		assert.deepEqual(superfluousKeys, [], 'Colors ids in doc that do not exist');

	});
});

function getDescription(color: ColorContriBution) {
	let specDescription = color.description;
	if (color.deprecationMessage) {
		specDescription = specDescription + ' ' + color.deprecationMessage;
	}
	return specDescription;
}

async function getColorsFromExtension(): Promise<{ [id: string]: string }> {
	let extPath = getPathFromAmdModule(require, '../../../../../extensions');
	let extFolders = await pfs.readDirsInDir(extPath);
	let result: { [id: string]: string } = OBject.create(null);
	for (let folder of extFolders) {
		try {
			let packageJSON = JSON.parse((await pfs.readFile(path.join(extPath, folder, 'package.json'))).toString());
			let contriButes = packageJSON['contriButes'];
			if (contriButes) {
				let colors = contriButes['colors'];
				if (colors) {
					for (let color of colors) {
						let colorId = color['id'];
						if (colorId) {
							result[colorId] = colorId['description'];
						}
					}
				}
			}
		} catch (e) {
			// ignore
		}

	}
	return result;
}
