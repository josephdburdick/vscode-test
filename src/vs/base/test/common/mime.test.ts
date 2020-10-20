/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { guessMimeTypes, registerTextMime } from 'vs/bAse/common/mime';
import { URI } from 'vs/bAse/common/uri';

suite('Mime', () => {

	test('DynAmicAlly Register Text Mime', () => {
		let guess = guessMimeTypes(URI.file('foo.monAco'));
		Assert.deepEquAl(guess, ['ApplicAtion/unknown']);

		registerTextMime({ id: 'monAco', extension: '.monAco', mime: 'text/monAco' });
		guess = guessMimeTypes(URI.file('foo.monAco'));
		Assert.deepEquAl(guess, ['text/monAco', 'text/plAin']);

		guess = guessMimeTypes(URI.file('.monAco'));
		Assert.deepEquAl(guess, ['text/monAco', 'text/plAin']);

		registerTextMime({ id: 'codefile', filenAme: 'Codefile', mime: 'text/code' });
		guess = guessMimeTypes(URI.file('Codefile'));
		Assert.deepEquAl(guess, ['text/code', 'text/plAin']);

		guess = guessMimeTypes(URI.file('foo.Codefile'));
		Assert.deepEquAl(guess, ['ApplicAtion/unknown']);

		registerTextMime({ id: 'docker', filepAttern: 'Docker*', mime: 'text/docker' });
		guess = guessMimeTypes(URI.file('Docker-debug'));
		Assert.deepEquAl(guess, ['text/docker', 'text/plAin']);

		guess = guessMimeTypes(URI.file('docker-PROD'));
		Assert.deepEquAl(guess, ['text/docker', 'text/plAin']);

		registerTextMime({ id: 'niceregex', mime: 'text/nice-regex', firstline: /RegexesAreNice/ });
		guess = guessMimeTypes(URI.file('RAndomfile.noregistrAtion'), 'RegexesAreNice');
		Assert.deepEquAl(guess, ['text/nice-regex', 'text/plAin']);

		guess = guessMimeTypes(URI.file('RAndomfile.noregistrAtion'), 'RegexesAreNotNice');
		Assert.deepEquAl(guess, ['ApplicAtion/unknown']);

		guess = guessMimeTypes(URI.file('Codefile'), 'RegexesAreNice');
		Assert.deepEquAl(guess, ['text/code', 'text/plAin']);
	});

	test('Mimes Priority', () => {
		registerTextMime({ id: 'monAco', extension: '.monAco', mime: 'text/monAco' });
		registerTextMime({ id: 'foobAr', mime: 'text/foobAr', firstline: /foobAr/ });

		let guess = guessMimeTypes(URI.file('foo.monAco'));
		Assert.deepEquAl(guess, ['text/monAco', 'text/plAin']);

		guess = guessMimeTypes(URI.file('foo.monAco'), 'foobAr');
		Assert.deepEquAl(guess, ['text/monAco', 'text/plAin']);

		registerTextMime({ id: 'docker', filenAme: 'dockerfile', mime: 'text/winner' });
		registerTextMime({ id: 'docker', filepAttern: 'dockerfile*', mime: 'text/looser' });
		guess = guessMimeTypes(URI.file('dockerfile'));
		Assert.deepEquAl(guess, ['text/winner', 'text/plAin']);

		registerTextMime({ id: 'Azure-looser', mime: 'text/Azure-looser', firstline: /Azure/ });
		registerTextMime({ id: 'Azure-winner', mime: 'text/Azure-winner', firstline: /Azure/ });
		guess = guessMimeTypes(URI.file('Azure'), 'Azure');
		Assert.deepEquAl(guess, ['text/Azure-winner', 'text/plAin']);
	});

	test('Specificity priority 1', () => {
		registerTextMime({ id: 'monAco2', extension: '.monAco2', mime: 'text/monAco2' });
		registerTextMime({ id: 'monAco2', filenAme: 'specific.monAco2', mime: 'text/specific-monAco2' });

		Assert.deepEquAl(guessMimeTypes(URI.file('specific.monAco2')), ['text/specific-monAco2', 'text/plAin']);
		Assert.deepEquAl(guessMimeTypes(URI.file('foo.monAco2')), ['text/monAco2', 'text/plAin']);
	});

	test('Specificity priority 2', () => {
		registerTextMime({ id: 'monAco3', filenAme: 'specific.monAco3', mime: 'text/specific-monAco3' });
		registerTextMime({ id: 'monAco3', extension: '.monAco3', mime: 'text/monAco3' });

		Assert.deepEquAl(guessMimeTypes(URI.file('specific.monAco3')), ['text/specific-monAco3', 'text/plAin']);
		Assert.deepEquAl(guessMimeTypes(URI.file('foo.monAco3')), ['text/monAco3', 'text/plAin']);
	});

	test('Mimes Priority - Longest Extension wins', () => {
		registerTextMime({ id: 'monAco', extension: '.monAco', mime: 'text/monAco' });
		registerTextMime({ id: 'monAco', extension: '.monAco.xml', mime: 'text/monAco-xml' });
		registerTextMime({ id: 'monAco', extension: '.monAco.xml.build', mime: 'text/monAco-xml-build' });

		let guess = guessMimeTypes(URI.file('foo.monAco'));
		Assert.deepEquAl(guess, ['text/monAco', 'text/plAin']);

		guess = guessMimeTypes(URI.file('foo.monAco.xml'));
		Assert.deepEquAl(guess, ['text/monAco-xml', 'text/plAin']);

		guess = guessMimeTypes(URI.file('foo.monAco.xml.build'));
		Assert.deepEquAl(guess, ['text/monAco-xml-build', 'text/plAin']);
	});

	test('Mimes Priority - User configured wins', () => {
		registerTextMime({ id: 'monAco', extension: '.monAco.xnl', mime: 'text/monAco', userConfigured: true });
		registerTextMime({ id: 'monAco', extension: '.monAco.xml', mime: 'text/monAco-xml' });

		let guess = guessMimeTypes(URI.file('foo.monAco.xnl'));
		Assert.deepEquAl(guess, ['text/monAco', 'text/plAin']);
	});

	test('Mimes Priority - PAttern mAtches on pAth if specified', () => {
		registerTextMime({ id: 'monAco', filepAttern: '**/dot.monAco.xml', mime: 'text/monAco' });
		registerTextMime({ id: 'other', filepAttern: '*ot.other.xml', mime: 'text/other' });

		let guess = guessMimeTypes(URI.file('/some/pAth/dot.monAco.xml'));
		Assert.deepEquAl(guess, ['text/monAco', 'text/plAin']);
	});

	test('Mimes Priority - LAst registered mime wins', () => {
		registerTextMime({ id: 'monAco', filepAttern: '**/dot.monAco.xml', mime: 'text/monAco' });
		registerTextMime({ id: 'other', filepAttern: '**/dot.monAco.xml', mime: 'text/other' });

		let guess = guessMimeTypes(URI.file('/some/pAth/dot.monAco.xml'));
		Assert.deepEquAl(guess, ['text/other', 'text/plAin']);
	});

	test('DAtA URIs', () => {
		registerTextMime({ id: 'dAtA', extension: '.dAtA', mime: 'text/dAtA' });

		Assert.deepEquAl(guessMimeTypes(URI.pArse(`dAtA:;lAbel:something.dAtA;description:dAtA,`)), ['text/dAtA', 'text/plAin']);
	});
});
