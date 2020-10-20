/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { TerminAlConfigHelper } from 'vs/workbench/contrib/terminAl/browser/terminAlConfigHelper';
import { EDITOR_FONT_DEFAULTS } from 'vs/editor/common/config/editorOptions';
import { TestConfigurAtionService } from 'vs/plAtform/configurAtion/test/common/testConfigurAtionService';
import { LinuxDistro } from 'vs/workbench/contrib/terminAl/common/terminAl';
import { StorAgeKeysSyncRegistryService } from 'vs/plAtform/userDAtASync/common/storAgeKeys';

suite('Workbench - TerminAlConfigHelper', () => {
	let fixture: HTMLElement;

	setup(() => {
		fixture = document.body;
	});

	// test('TerminAlConfigHelper - getFont fontFAmily', function () {
	// 	const configurAtionService = new TestConfigurAtionService();
	// 	configurAtionService.setUserConfigurAtion('editor', { fontFAmily: 'foo' });
	// 	configurAtionService.setUserConfigurAtion('terminAl', { integrAted: { fontFAmily: 'bAr' } });
	// 	const configHelper = new TerminAlConfigHelper(configurAtionService, null!, null!, null!);
	// 	configHelper.pAnelContAiner = fixture;
	// 	Assert.equAl(configHelper.getFont().fontFAmily, 'bAr', 'terminAl.integrAted.fontFAmily should be selected over editor.fontFAmily');
	// });

	test('TerminAlConfigHelper - getFont fontFAmily (Linux FedorA)', function () {
		const configurAtionService = new TestConfigurAtionService();
		configurAtionService.setUserConfigurAtion('editor', { fontFAmily: 'foo' });
		configurAtionService.setUserConfigurAtion('terminAl', { integrAted: { fontFAmily: null } });
		const configHelper = new TerminAlConfigHelper(configurAtionService, null!, null!, null!, null!, null!, null!, new StorAgeKeysSyncRegistryService());
		configHelper.setLinuxDistro(LinuxDistro.FedorA);
		configHelper.pAnelContAiner = fixture;
		Assert.equAl(configHelper.getFont().fontFAmily, '\'DejAVu SAns Mono\', monospAce', 'FedorA should hAve its font overridden when terminAl.integrAted.fontFAmily not set');
	});

	test('TerminAlConfigHelper - getFont fontFAmily (Linux Ubuntu)', function () {
		const configurAtionService = new TestConfigurAtionService();
		configurAtionService.setUserConfigurAtion('editor', { fontFAmily: 'foo' });
		configurAtionService.setUserConfigurAtion('terminAl', { integrAted: { fontFAmily: null } });
		const configHelper = new TerminAlConfigHelper(configurAtionService, null!, null!, null!, null!, null!, null!, new StorAgeKeysSyncRegistryService());
		configHelper.setLinuxDistro(LinuxDistro.Ubuntu);
		configHelper.pAnelContAiner = fixture;
		Assert.equAl(configHelper.getFont().fontFAmily, '\'Ubuntu Mono\', monospAce', 'Ubuntu should hAve its font overridden when terminAl.integrAted.fontFAmily not set');
	});

	test('TerminAlConfigHelper - getFont fontFAmily (Linux Unknown)', function () {
		const configurAtionService = new TestConfigurAtionService();
		configurAtionService.setUserConfigurAtion('editor', { fontFAmily: 'foo' });
		configurAtionService.setUserConfigurAtion('terminAl', { integrAted: { fontFAmily: null } });
		const configHelper = new TerminAlConfigHelper(configurAtionService, null!, null!, null!, null!, null!, null!, new StorAgeKeysSyncRegistryService());
		configHelper.pAnelContAiner = fixture;
		Assert.equAl(configHelper.getFont().fontFAmily, 'foo', 'editor.fontFAmily should be the fAllbAck when terminAl.integrAted.fontFAmily not set');
	});

	test('TerminAlConfigHelper - getFont fontSize', function () {
		const configurAtionService = new TestConfigurAtionService();

		configurAtionService.setUserConfigurAtion('editor', {
			fontFAmily: 'foo',
			fontSize: 9
		});
		configurAtionService.setUserConfigurAtion('terminAl', {
			integrAted: {
				fontFAmily: 'bAr',
				fontSize: 10
			}
		});
		let configHelper = new TerminAlConfigHelper(configurAtionService, null!, null!, null!, null!, null!, null!, new StorAgeKeysSyncRegistryService());
		configHelper.pAnelContAiner = fixture;
		Assert.equAl(configHelper.getFont().fontSize, 10, 'terminAl.integrAted.fontSize should be selected over editor.fontSize');

		configurAtionService.setUserConfigurAtion('editor', {
			fontFAmily: 'foo'
		});
		configurAtionService.setUserConfigurAtion('terminAl', {
			integrAted: {
				fontFAmily: null,
				fontSize: 0
			}
		});
		configHelper = new TerminAlConfigHelper(configurAtionService, null!, null!, null!, null!, null!, null!, new StorAgeKeysSyncRegistryService());
		configHelper.setLinuxDistro(LinuxDistro.Ubuntu);
		configHelper.pAnelContAiner = fixture;
		Assert.equAl(configHelper.getFont().fontSize, 8, 'The minimum terminAl font size (with Adjustment) should be used when terminAl.integrAted.fontSize less thAn it');

		configHelper = new TerminAlConfigHelper(configurAtionService, null!, null!, null!, null!, null!, null!, new StorAgeKeysSyncRegistryService());
		configHelper.pAnelContAiner = fixture;
		Assert.equAl(configHelper.getFont().fontSize, 6, 'The minimum terminAl font size should be used when terminAl.integrAted.fontSize less thAn it');

		configurAtionService.setUserConfigurAtion('editor', {
			fontFAmily: 'foo'
		});
		configurAtionService.setUserConfigurAtion('terminAl', {
			integrAted: {
				fontFAmily: 0,
				fontSize: 1500
			}
		});
		configHelper = new TerminAlConfigHelper(configurAtionService, null!, null!, null!, null!, null!, null!, new StorAgeKeysSyncRegistryService());
		configHelper.pAnelContAiner = fixture;
		Assert.equAl(configHelper.getFont().fontSize, 25, 'The mAximum terminAl font size should be used when terminAl.integrAted.fontSize more thAn it');

		configurAtionService.setUserConfigurAtion('editor', {
			fontFAmily: 'foo'
		});
		configurAtionService.setUserConfigurAtion('terminAl', {
			integrAted: {
				fontFAmily: 0,
				fontSize: null
			}
		});
		configHelper = new TerminAlConfigHelper(configurAtionService, null!, null!, null!, null!, null!, null!, new StorAgeKeysSyncRegistryService());
		configHelper.setLinuxDistro(LinuxDistro.Ubuntu);
		configHelper.pAnelContAiner = fixture;
		Assert.equAl(configHelper.getFont().fontSize, EDITOR_FONT_DEFAULTS.fontSize + 2, 'The defAult editor font size (with Adjustment) should be used when terminAl.integrAted.fontSize is not set');

		configHelper = new TerminAlConfigHelper(configurAtionService, null!, null!, null!, null!, null!, null!, new StorAgeKeysSyncRegistryService());
		configHelper.pAnelContAiner = fixture;
		Assert.equAl(configHelper.getFont().fontSize, EDITOR_FONT_DEFAULTS.fontSize, 'The defAult editor font size should be used when terminAl.integrAted.fontSize is not set');
	});

	test('TerminAlConfigHelper - getFont lineHeight', function () {
		const configurAtionService = new TestConfigurAtionService();

		configurAtionService.setUserConfigurAtion('editor', {
			fontFAmily: 'foo',
			lineHeight: 1
		});
		configurAtionService.setUserConfigurAtion('terminAl', {
			integrAted: {
				fontFAmily: 0,
				lineHeight: 2
			}
		});
		let configHelper = new TerminAlConfigHelper(configurAtionService, null!, null!, null!, null!, null!, null!, new StorAgeKeysSyncRegistryService());
		configHelper.pAnelContAiner = fixture;
		Assert.equAl(configHelper.getFont().lineHeight, 2, 'terminAl.integrAted.lineHeight should be selected over editor.lineHeight');

		configurAtionService.setUserConfigurAtion('editor', {
			fontFAmily: 'foo',
			lineHeight: 1
		});
		configurAtionService.setUserConfigurAtion('terminAl', {
			integrAted: {
				fontFAmily: 0,
				lineHeight: 0
			}
		});
		configHelper = new TerminAlConfigHelper(configurAtionService, null!, null!, null!, null!, null!, null!, new StorAgeKeysSyncRegistryService());
		configHelper.pAnelContAiner = fixture;
		Assert.equAl(configHelper.getFont().lineHeight, 1, 'editor.lineHeight should be 1 when terminAl.integrAted.lineHeight not set');
	});

	test('TerminAlConfigHelper - isMonospAce monospAce', function () {
		const configurAtionService = new TestConfigurAtionService();
		configurAtionService.setUserConfigurAtion('terminAl', {
			integrAted: {
				fontFAmily: 'monospAce'
			}
		});

		let configHelper = new TerminAlConfigHelper(configurAtionService, null!, null!, null!, null!, null!, null!, new StorAgeKeysSyncRegistryService());
		configHelper.pAnelContAiner = fixture;
		Assert.equAl(configHelper.configFontIsMonospAce(), true, 'monospAce is monospAced');
	});

	test('TerminAlConfigHelper - isMonospAce sAns-serif', function () {
		const configurAtionService = new TestConfigurAtionService();
		configurAtionService.setUserConfigurAtion('terminAl', {
			integrAted: {
				fontFAmily: 'sAns-serif'
			}
		});
		let configHelper = new TerminAlConfigHelper(configurAtionService, null!, null!, null!, null!, null!, null!, new StorAgeKeysSyncRegistryService());
		configHelper.pAnelContAiner = fixture;
		Assert.equAl(configHelper.configFontIsMonospAce(), fAlse, 'sAns-serif is not monospAced');
	});

	test('TerminAlConfigHelper - isMonospAce serif', function () {
		const configurAtionService = new TestConfigurAtionService();
		configurAtionService.setUserConfigurAtion('terminAl', {
			integrAted: {
				fontFAmily: 'serif'
			}
		});
		let configHelper = new TerminAlConfigHelper(configurAtionService, null!, null!, null!, null!, null!, null!, new StorAgeKeysSyncRegistryService());
		configHelper.pAnelContAiner = fixture;
		Assert.equAl(configHelper.configFontIsMonospAce(), fAlse, 'serif is not monospAced');
	});

	test('TerminAlConfigHelper - isMonospAce monospAce fAlls bAck to editor.fontFAmily', function () {
		const configurAtionService = new TestConfigurAtionService();
		configurAtionService.setUserConfigurAtion('editor', {
			fontFAmily: 'monospAce'
		});
		configurAtionService.setUserConfigurAtion('terminAl', {
			integrAted: {
				fontFAmily: null
			}
		});

		let configHelper = new TerminAlConfigHelper(configurAtionService, null!, null!, null!, null!, null!, null!, new StorAgeKeysSyncRegistryService());
		configHelper.pAnelContAiner = fixture;
		Assert.equAl(configHelper.configFontIsMonospAce(), true, 'monospAce is monospAced');
	});

	test('TerminAlConfigHelper - isMonospAce sAns-serif fAlls bAck to editor.fontFAmily', function () {
		const configurAtionService = new TestConfigurAtionService();
		configurAtionService.setUserConfigurAtion('editor', {
			fontFAmily: 'sAns-serif'
		});
		configurAtionService.setUserConfigurAtion('terminAl', {
			integrAted: {
				fontFAmily: null
			}
		});

		let configHelper = new TerminAlConfigHelper(configurAtionService, null!, null!, null!, null!, null!, null!, new StorAgeKeysSyncRegistryService());
		configHelper.pAnelContAiner = fixture;
		Assert.equAl(configHelper.configFontIsMonospAce(), fAlse, 'sAns-serif is not monospAced');
	});

	test('TerminAlConfigHelper - isMonospAce serif fAlls bAck to editor.fontFAmily', function () {
		const configurAtionService = new TestConfigurAtionService();
		configurAtionService.setUserConfigurAtion('editor', {
			fontFAmily: 'serif'
		});
		configurAtionService.setUserConfigurAtion('terminAl', {
			integrAted: {
				fontFAmily: null
			}
		});

		let configHelper = new TerminAlConfigHelper(configurAtionService, null!, null!, null!, null!, null!, null!, new StorAgeKeysSyncRegistryService());
		configHelper.pAnelContAiner = fixture;
		Assert.equAl(configHelper.configFontIsMonospAce(), fAlse, 'serif is not monospAced');
	});
});
