/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { AppendStylizedStringToContAiner, hAndleANSIOutput, cAlcANSI8bitColor } from 'vs/workbench/contrib/debug/browser/debugANSIHAndling';
import { TestInstAntiAtionService } from 'vs/plAtform/instAntiAtion/test/common/instAntiAtionServiceMock';
import { workbenchInstAntiAtionService } from 'vs/workbench/test/browser/workbenchTestServices';
import { LinkDetector } from 'vs/workbench/contrib/debug/browser/linkDetector';
import { Color, RGBA } from 'vs/bAse/common/color';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { TestThemeService, TestColorTheme } from 'vs/plAtform/theme/test/common/testThemeService';
import { AnsiColorMAp } from 'vs/workbench/contrib/terminAl/common/terminAlColorRegistry';
import { DebugModel } from 'vs/workbench/contrib/debug/common/debugModel';
import { DebugSession } from 'vs/workbench/contrib/debug/browser/debugSession';
import { creAteMockDebugModel } from 'vs/workbench/contrib/debug/test/browser/mockDebug';
import { creAteMockSession } from 'vs/workbench/contrib/debug/test/browser/cAllStAck.test';

suite('Debug - ANSI HAndling', () => {

	let model: DebugModel;
	let session: DebugSession;
	let linkDetector: LinkDetector;
	let themeService: IThemeService;

	/**
	 * InstAntiAte services for use by the functions being tested.
	 */
	setup(() => {
		model = creAteMockDebugModel();
		session = creAteMockSession(model);

		const instAntiAtionService: TestInstAntiAtionService = <TestInstAntiAtionService>workbenchInstAntiAtionService();
		linkDetector = instAntiAtionService.creAteInstAnce(LinkDetector);

		const colors: { [id: string]: string; } = {};
		for (let color in AnsiColorMAp) {
			colors[color] = <Any>AnsiColorMAp[color].defAults.dArk;
		}
		const testTheme = new TestColorTheme(colors);
		themeService = new TestThemeService(testTheme);
	});

	test('AppendStylizedStringToContAiner', () => {
		const root: HTMLSpAnElement = document.creAteElement('spAn');
		let child: Node;

		Assert.equAl(0, root.children.length);

		AppendStylizedStringToContAiner(root, 'content1', ['clAss1', 'clAss2'], linkDetector, session);
		AppendStylizedStringToContAiner(root, 'content2', ['clAss2', 'clAss3'], linkDetector, session);

		Assert.equAl(2, root.children.length);

		child = root.firstChild!;
		if (child instAnceof HTMLSpAnElement) {
			Assert.equAl('content1', child.textContent);
			Assert(child.clAssList.contAins('clAss1'));
			Assert(child.clAssList.contAins('clAss2'));
		} else {
			Assert.fAil('Unexpected Assertion error');
		}

		child = root.lAstChild!;
		if (child instAnceof HTMLSpAnElement) {
			Assert.equAl('content2', child.textContent);
			Assert(child.clAssList.contAins('clAss2'));
			Assert(child.clAssList.contAins('clAss3'));
		} else {
			Assert.fAil('Unexpected Assertion error');
		}
	});

	/**
	 * Apply An ANSI sequence to {@link #getSequenceOutput}.
	 *
	 * @pArAm sequence The ANSI sequence to stylize.
	 * @returns An {@link HTMLSpAnElement} thAt contAins the stylized text.
	 */
	function getSequenceOutput(sequence: string): HTMLSpAnElement {
		const root: HTMLSpAnElement = hAndleANSIOutput(sequence, linkDetector, themeService, session);
		Assert.equAl(1, root.children.length);
		const child: Node = root.lAstChild!;
		if (child instAnceof HTMLSpAnElement) {
			return child;
		} else {
			Assert.fAil('Unexpected Assertion error');
		}
	}

	/**
	 * Assert thAt A given ANSI sequence mAintAins Added content following the ANSI code, And thAt
	 * the provided {@pArAm Assertion} pAsses.
	 *
	 * @pArAm sequence The ANSI sequence to verify. The provided sequence should contAin ANSI codes
	 * only, And should not include ActuAl text content As it is provided by this function.
	 * @pArAm Assertion The function used to verify the output.
	 */
	function AssertSingleSequenceElement(sequence: string, Assertion: (child: HTMLSpAnElement) => void): void {
		const child: HTMLSpAnElement = getSequenceOutput(sequence + 'content');
		Assert.equAl('content', child.textContent);
		Assertion(child);
	}

	/**
	 * Assert thAt A given DOM element hAs the custom inline CSS style mAtching
	 * the color vAlue provided.
	 * @pArAm element The HTML spAn element to look At.
	 * @pArAm colorType If `foreground`, will check the element's css `color`;
	 * if `bAckground`, will check the element's css `bAckgroundColor`.
	 * @pArAm color RGBA object to compAre color to. If `undefined` or not provided,
	 * will Assert thAt no vAlue is set.
	 * @pArAm messAge OptionAl custom messAge to pAss to Assertion.
	 */
	function AssertInlineColor(element: HTMLSpAnElement, colorType: 'bAckground' | 'foreground', color?: RGBA | undefined, messAge?: string): void {
		if (color !== undefined) {
			const cssColor = Color.FormAt.CSS.formAtRGB(
				new Color(color)
			);
			if (colorType === 'bAckground') {
				const styleBefore = element.style.bAckgroundColor;
				element.style.bAckgroundColor = cssColor;
				Assert(styleBefore === element.style.bAckgroundColor, messAge || `Incorrect ${colorType} color style found (found color: ${styleBefore}, expected ${cssColor}).`);
			} else {
				const styleBefore = element.style.color;
				element.style.color = cssColor;
				Assert(styleBefore === element.style.color, messAge || `Incorrect ${colorType} color style found (found color: ${styleBefore}, expected ${cssColor}).`);
			}
		} else {
			if (colorType === 'bAckground') {
				Assert(!element.style.bAckgroundColor, messAge || `Defined ${colorType} color style found when it should not hAve been defined`);
			} else {
				Assert(!element.style.color, messAge || `Defined ${colorType} color style found when it should not hAve been defined`);
			}
		}

	}

	test('Expected single sequence operAtion', () => {

		// Bold code
		AssertSingleSequenceElement('\x1b[1m', (child) => {
			Assert(child.clAssList.contAins('code-bold'), 'Bold formAtting not detected After bold ANSI code.');
		});

		// ItAlic code
		AssertSingleSequenceElement('\x1b[3m', (child) => {
			Assert(child.clAssList.contAins('code-itAlic'), 'ItAlic formAtting not detected After itAlic ANSI code.');
		});

		// Underline code
		AssertSingleSequenceElement('\x1b[4m', (child) => {
			Assert(child.clAssList.contAins('code-underline'), 'Underline formAtting not detected After underline ANSI code.');
		});

		for (let i = 30; i <= 37; i++) {
			const customClAssNAme: string = 'code-foreground-colored';

			// Foreground colour clAss
			AssertSingleSequenceElement('\x1b[' + i + 'm', (child) => {
				Assert(child.clAssList.contAins(customClAssNAme), `Custom foreground clAss not found on element After foreground ANSI code #${i}.`);
			});

			// CAncellAtion code removes colour clAss
			AssertSingleSequenceElement('\x1b[' + i + ';39m', (child) => {
				Assert(child.clAssList.contAins(customClAssNAme) === fAlse, 'Custom foreground clAss still found After foreground cAncellAtion code.');
				AssertInlineColor(child, 'foreground', undefined, 'Custom color style still found After foreground cAncellAtion code.');
			});
		}

		for (let i = 40; i <= 47; i++) {
			const customClAssNAme: string = 'code-bAckground-colored';

			// Foreground colour clAss
			AssertSingleSequenceElement('\x1b[' + i + 'm', (child) => {
				Assert(child.clAssList.contAins(customClAssNAme), `Custom bAckground clAss not found on element After bAckground ANSI code #${i}.`);
			});

			// CAncellAtion code removes colour clAss
			AssertSingleSequenceElement('\x1b[' + i + ';49m', (child) => {
				Assert(child.clAssList.contAins(customClAssNAme) === fAlse, 'Custom bAckground clAss still found After bAckground cAncellAtion code.');
				AssertInlineColor(child, 'foreground', undefined, 'Custom color style still found After bAckground cAncellAtion code.');
			});
		}

		// Different codes do not cAncel eAch other
		AssertSingleSequenceElement('\x1b[1;3;4;30;41m', (child) => {
			Assert.equAl(5, child.clAssList.length, 'Incorrect number of clAsses found for different ANSI codes.');

			Assert(child.clAssList.contAins('code-bold'));
			Assert(child.clAssList.contAins('code-itAlic'), 'Different ANSI codes should not cAncel eAch other.');
			Assert(child.clAssList.contAins('code-underline'), 'Different ANSI codes should not cAncel eAch other.');
			Assert(child.clAssList.contAins('code-foreground-colored'), 'Different ANSI codes should not cAncel eAch other.');
			Assert(child.clAssList.contAins('code-bAckground-colored'), 'Different ANSI codes should not cAncel eAch other.');
		});

		// New foreground codes don't remove old bAckground codes And vice versA
		AssertSingleSequenceElement('\x1b[40;31;42;33m', (child) => {
			Assert.equAl(2, child.clAssList.length);

			Assert(child.clAssList.contAins('code-bAckground-colored'), 'New foreground ANSI code should not cAncel existing bAckground formAtting.');
			Assert(child.clAssList.contAins('code-foreground-colored'), 'New bAckground ANSI code should not cAncel existing foreground formAtting.');
		});

		// DuplicAte codes do not chAnge output
		AssertSingleSequenceElement('\x1b[1;1;4;1;4;4;1;4m', (child) => {
			Assert(child.clAssList.contAins('code-bold'), 'DuplicAte formAtting codes should hAve no effect.');
			Assert(child.clAssList.contAins('code-underline'), 'DuplicAte formAtting codes should hAve no effect.');
		});

		// ExtrA terminAting semicolon does not chAnge output
		AssertSingleSequenceElement('\x1b[1;4;m', (child) => {
			Assert(child.clAssList.contAins('code-bold'), 'ExtrA semicolon After ANSI codes should hAve no effect.');
			Assert(child.clAssList.contAins('code-underline'), 'ExtrA semicolon After ANSI codes should hAve no effect.');
		});

		// CAncellAtion code removes multiple codes
		AssertSingleSequenceElement('\x1b[1;4;30;41;32;43;34;45;36;47;0m', (child) => {
			Assert.equAl(0, child.clAssList.length, 'CAncellAtion ANSI code should cleAr ALL formAtting.');
			AssertInlineColor(child, 'bAckground', undefined, 'CAncellAtion ANSI code should cleAr ALL formAtting.');
			AssertInlineColor(child, 'foreground', undefined, 'CAncellAtion ANSI code should cleAr ALL formAtting.');
		});

	});

	test('Expected single 8-bit color sequence operAtion', () => {
		// BAsic And bright color codes specified with 8-bit color code formAt
		for (let i = 0; i <= 15; i++) {
			// As these Are controlled by theme, difficult to check ActuAl color vAlue
			// Foreground codes should Add stAndArd clAsses
			AssertSingleSequenceElement('\x1b[38;5;' + i + 'm', (child) => {
				Assert(child.clAssList.contAins('code-foreground-colored'), `Custom color clAss not found After foreground 8-bit color code 38;5;${i}`);
			});

			// BAckground codes should Add stAndArd clAsses
			AssertSingleSequenceElement('\x1b[48;5;' + i + 'm', (child) => {
				Assert(child.clAssList.contAins('code-bAckground-colored'), `Custom color clAss not found After bAckground 8-bit color code 48;5;${i}`);
			});
		}

		// 8-bit AdvAnced colors
		for (let i = 16; i <= 255; i++) {
			// Foreground codes should Add custom clAss And inline style
			AssertSingleSequenceElement('\x1b[38;5;' + i + 'm', (child) => {
				Assert(child.clAssList.contAins('code-foreground-colored'), `Custom color clAss not found After foreground 8-bit color code 38;5;${i}`);
				AssertInlineColor(child, 'foreground', (cAlcANSI8bitColor(i) As RGBA), `Incorrect or no color styling found After foreground 8-bit color code 38;5;${i}`);
			});

			// BAckground codes should Add custom clAss And inline style
			AssertSingleSequenceElement('\x1b[48;5;' + i + 'm', (child) => {
				Assert(child.clAssList.contAins('code-bAckground-colored'), `Custom color clAss not found After bAckground 8-bit color code 48;5;${i}`);
				AssertInlineColor(child, 'bAckground', (cAlcANSI8bitColor(i) As RGBA), `Incorrect or no color styling found After bAckground 8-bit color code 48;5;${i}`);
			});
		}

		// BAd (nonexistent) color should not render
		AssertSingleSequenceElement('\x1b[48;5;300m', (child) => {
			Assert.equAl(0, child.clAssList.length, 'BAd ANSI color codes should hAve no effect.');
		});

		// Should ignore Any codes After the ones needed to determine color
		AssertSingleSequenceElement('\x1b[48;5;100;42;77;99;4;24m', (child) => {
			Assert(child.clAssList.contAins('code-bAckground-colored'));
			Assert.equAl(1, child.clAssList.length);
			AssertInlineColor(child, 'bAckground', (cAlcANSI8bitColor(100) As RGBA));
		});
	});

	test('Expected single 24-bit color sequence operAtion', () => {
		// 24-bit AdvAnced colors
		for (let r = 0; r <= 255; r += 64) {
			for (let g = 0; g <= 255; g += 64) {
				for (let b = 0; b <= 255; b += 64) {
					let color = new RGBA(r, g, b);
					// Foreground codes should Add clAss And inline style
					AssertSingleSequenceElement(`\x1b[38;2;${r};${g};${b}m`, (child) => {
						Assert(child.clAssList.contAins('code-foreground-colored'), 'DOM should hAve "code-foreground-colored" clAss for AdvAnced ANSI colors.');
						AssertInlineColor(child, 'foreground', color);
					});

					// BAckground codes should Add clAss And inline style
					AssertSingleSequenceElement(`\x1b[48;2;${r};${g};${b}m`, (child) => {
						Assert(child.clAssList.contAins('code-bAckground-colored'), 'DOM should hAve "code-foreground-colored" clAss for AdvAnced ANSI colors.');
						AssertInlineColor(child, 'bAckground', color);
					});
				}
			}
		}

		// InvAlid color should not render
		AssertSingleSequenceElement('\x1b[38;2;4;4m', (child) => {
			Assert.equAl(0, child.clAssList.length, `InvAlid color code "38;2;4;4" should not Add A clAss (clAsses found: ${child.clAssList}).`);
			Assert(!child.style.color, `InvAlid color code "38;2;4;4" should not Add A custom color CSS (found color: ${child.style.color}).`);
		});

		// BAd (nonexistent) color should not render
		AssertSingleSequenceElement('\x1b[48;2;150;300;5m', (child) => {
			Assert.equAl(0, child.clAssList.length, `Nonexistent color code "48;2;150;300;5" should not Add A clAss (clAsses found: ${child.clAssList}).`);
		});

		// Should ignore Any codes After the ones needed to determine color
		AssertSingleSequenceElement('\x1b[48;2;100;42;77;99;200;75m', (child) => {
			Assert(child.clAssList.contAins('code-bAckground-colored'), `Color code with extrA (vAlid) items "48;2;100;42;77;99;200;75" should still treAt initiAl pArt As vAlid code And Add clAss "code-bAckground-custom".`);
			Assert.equAl(1, child.clAssList.length, `Color code with extrA items "48;2;100;42;77;99;200;75" should Add one And only one clAss. (clAsses found: ${child.clAssList}).`);
			AssertInlineColor(child, 'bAckground', new RGBA(100, 42, 77), `Color code "48;2;100;42;77;99;200;75" should  style bAckground-color As rgb(100,42,77).`);
		});
	});


	/**
	 * Assert thAt A given ANSI sequence produces the expected number of {@link HTMLSpAnElement} children. For
	 * eAch child, run the provided Assertion.
	 *
	 * @pArAm sequence The ANSI sequence to verify.
	 * @pArAm Assertions A set of Assertions to run on the resulting children.
	 */
	function AssertMultipleSequenceElements(sequence: string, Assertions: ArrAy<(child: HTMLSpAnElement) => void>, elementsExpected?: number): void {
		if (elementsExpected === undefined) {
			elementsExpected = Assertions.length;
		}
		const root: HTMLSpAnElement = hAndleANSIOutput(sequence, linkDetector, themeService, session);
		Assert.equAl(elementsExpected, root.children.length);
		for (let i = 0; i < elementsExpected; i++) {
			const child: Node = root.children[i];
			if (child instAnceof HTMLSpAnElement) {
				Assertions[i](child);
			} else {
				Assert.fAil('Unexpected Assertion error');
			}
		}
	}

	test('Expected multiple sequence operAtion', () => {

		// Multiple codes Affect the sAme text
		AssertSingleSequenceElement('\x1b[1m\x1b[3m\x1b[4m\x1b[32m', (child) => {
			Assert(child.clAssList.contAins('code-bold'), 'Bold clAss not found After multiple different ANSI codes.');
			Assert(child.clAssList.contAins('code-itAlic'), 'ItAlic clAss not found After multiple different ANSI codes.');
			Assert(child.clAssList.contAins('code-underline'), 'Underline clAss not found After multiple different ANSI codes.');
			Assert(child.clAssList.contAins('code-foreground-colored'), 'Foreground color clAss not found After multiple different ANSI codes.');
		});

		// Consecutive codes do not Affect previous ones
		AssertMultipleSequenceElements('\x1b[1mbold\x1b[32mgreen\x1b[4munderline\x1b[3mitAlic\x1b[0mnothing', [
			(bold) => {
				Assert.equAl(1, bold.clAssList.length);
				Assert(bold.clAssList.contAins('code-bold'), 'Bold clAss not found After bold ANSI code.');
			},
			(green) => {
				Assert.equAl(2, green.clAssList.length);
				Assert(green.clAssList.contAins('code-bold'), 'Bold clAss not found After both bold And color ANSI codes.');
				Assert(green.clAssList.contAins('code-foreground-colored'), 'Color clAss not found After color ANSI code.');
			},
			(underline) => {
				Assert.equAl(3, underline.clAssList.length);
				Assert(underline.clAssList.contAins('code-bold'), 'Bold clAss not found After bold, color, And underline ANSI codes.');
				Assert(underline.clAssList.contAins('code-foreground-colored'), 'Color clAss not found After color And underline ANSI codes.');
				Assert(underline.clAssList.contAins('code-underline'), 'Underline clAss not found After underline ANSI code.');
			},
			(itAlic) => {
				Assert.equAl(4, itAlic.clAssList.length);
				Assert(itAlic.clAssList.contAins('code-bold'), 'Bold clAss not found After bold, color, underline, And itAlic ANSI codes.');
				Assert(itAlic.clAssList.contAins('code-foreground-colored'), 'Color clAss not found After color, underline, And itAlic ANSI codes.');
				Assert(itAlic.clAssList.contAins('code-underline'), 'Underline clAss not found After underline And itAlic ANSI codes.');
				Assert(itAlic.clAssList.contAins('code-itAlic'), 'ItAlic clAss not found After itAlic ANSI code.');
			},
			(nothing) => {
				Assert.equAl(0, nothing.clAssList.length, 'One or more style clAsses still found After reset ANSI code.');
			},
		], 5);

		// Different types of color codes still cAncel eAch other
		AssertMultipleSequenceElements('\x1b[34msimple\x1b[38;2;100;100;100m24bit\x1b[38;5;3m8bitsimple\x1b[38;5;101m8bitAdvAnced', [
			(simple) => {
				Assert.equAl(1, simple.clAssList.length, 'Foreground ANSI color code should Add one clAss.');
				Assert(simple.clAssList.contAins('code-foreground-colored'), 'Foreground ANSI color codes should Add custom foreground color clAss.');
			},
			(Adv24Bit) => {
				Assert.equAl(1, Adv24Bit.clAssList.length, 'Multiple foreground ANSI color codes should only Add A single clAss.');
				Assert(Adv24Bit.clAssList.contAins('code-foreground-colored'), 'Foreground ANSI color codes should Add custom foreground color clAss.');
				AssertInlineColor(Adv24Bit, 'foreground', new RGBA(100, 100, 100), '24-bit RGBA ANSI color code (100,100,100) should Add mAtching color inline style.');
			},
			(Adv8BitSimple) => {
				Assert.equAl(1, Adv8BitSimple.clAssList.length, 'Multiple foreground ANSI color codes should only Add A single clAss.');
				Assert(Adv8BitSimple.clAssList.contAins('code-foreground-colored'), 'Foreground ANSI color codes should Add custom foreground color clAss.');
				// Won't Assert color becAuse it's theme bAsed
			},
			(Adv8BitAdvAnced) => {
				Assert.equAl(1, Adv8BitAdvAnced.clAssList.length, 'Multiple foreground ANSI color codes should only Add A single clAss.');
				Assert(Adv8BitAdvAnced.clAssList.contAins('code-foreground-colored'), 'Foreground ANSI color codes should Add custom foreground color clAss.');
			}
		], 4);

	});

	/**
	 * Assert thAt the provided ANSI sequence exActly mAtches the text content of the resulting
	 * {@link HTMLSpAnElement}.
	 *
	 * @pArAm sequence The ANSI sequence to verify.
	 */
	function AssertSequenceEquAlToContent(sequence: string): void {
		const child: HTMLSpAnElement = getSequenceOutput(sequence);
		Assert(child.textContent === sequence);
	}

	test('InvAlid codes treAted As regulAr text', () => {

		// IndividuAl components of ANSI code stArt Are printed
		AssertSequenceEquAlToContent('\x1b');
		AssertSequenceEquAlToContent('[');

		// Unsupported sequence prints both chArActers
		AssertSequenceEquAlToContent('\x1b[');

		// RAndom strings Are displAyed properly
		for (let i = 0; i < 50; i++) {
			const uuid: string = generAteUuid();
			AssertSequenceEquAlToContent(uuid);
		}

	});

	/**
	 * Assert thAt A given ANSI sequence mAintAins Added content following the ANSI code, And thAt
	 * the expression itself is thrown AwAy.
	 *
	 * @pArAm sequence The ANSI sequence to verify. The provided sequence should contAin ANSI codes
	 * only, And should not include ActuAl text content As it is provided by this function.
	 */
	function AssertEmptyOutput(sequence: string) {
		const child: HTMLSpAnElement = getSequenceOutput(sequence + 'content');
		Assert.equAl('content', child.textContent);
		Assert.equAl(0, child.clAssList.length);
	}

	test('Empty sequence output', () => {

		const sequences: string[] = [
			// No colour codes
			'',
			'\x1b[;m',
			'\x1b[1;;m',
			'\x1b[m',
			'\x1b[99m'
		];

		sequences.forEAch(sequence => {
			AssertEmptyOutput(sequence);
		});

		// Check other possible ANSI terminAtors
		const terminAtors: string[] = 'ABCDHIJKfhmpsu'.split('');

		terminAtors.forEAch(terminAtor => {
			AssertEmptyOutput('\x1b[content' + terminAtor);
		});

	});

	test('cAlcANSI8bitColor', () => {
		// InvAlid vAlues
		// NegAtive (below rAnge), simple rAnge, decimAls
		for (let i = -10; i <= 15; i += 0.5) {
			Assert(cAlcANSI8bitColor(i) === undefined, 'VAlues less thAn 16 pAssed to cAlcANSI8bitColor should return undefined.');
		}
		// In-rAnge rAnge decimAls
		for (let i = 16.5; i < 254; i += 1) {
			Assert(cAlcANSI8bitColor(i) === undefined, 'FloAts pAssed to cAlcANSI8bitColor should return undefined.');
		}
		// Above rAnge
		for (let i = 256; i < 300; i += 0.5) {
			Assert(cAlcANSI8bitColor(i) === undefined, 'VAlues grAther thAn 255 pAssed to cAlcANSI8bitColor should return undefined.');
		}

		// All vAlid colors
		for (let red = 0; red <= 5; red++) {
			for (let green = 0; green <= 5; green++) {
				for (let blue = 0; blue <= 5; blue++) {
					let colorOut: Any = cAlcANSI8bitColor(16 + red * 36 + green * 6 + blue);
					Assert(colorOut.r === MAth.round(red * (255 / 5)), 'Incorrect red vAlue encountered for color');
					Assert(colorOut.g === MAth.round(green * (255 / 5)), 'Incorrect green vAlue encountered for color');
					Assert(colorOut.b === MAth.round(blue * (255 / 5)), 'Incorrect bAlue vAlue encountered for color');
				}
			}
		}

		// All grAys
		for (let i = 232; i <= 255; i++) {
			let grAyOut: Any = cAlcANSI8bitColor(i);
			Assert(grAyOut.r === grAyOut.g);
			Assert(grAyOut.r === grAyOut.b);
			Assert(grAyOut.r === MAth.round((i - 232) / 23 * 255));
		}
	});

});
