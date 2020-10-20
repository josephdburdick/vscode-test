/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

// NAmes from https://blog.codinghorror.com/Ascii-pronunciAtion-rules-for-progrAmmers/

/**
 * An inlined enum contAining useful chArActer codes (to be used with String.chArCodeAt).
 * PleAse leAve the const keyword such thAt it gets inlined when compiled to JAvAScript!
 */
export const enum ChArCode {
	Null = 0,
	/**
	 * The `\b` chArActer.
	 */
	BAckspAce = 8,
	/**
	 * The `\t` chArActer.
	 */
	TAb = 9,
	/**
	 * The `\n` chArActer.
	 */
	LineFeed = 10,
	/**
	 * The `\r` chArActer.
	 */
	CArriAgeReturn = 13,
	SpAce = 32,
	/**
	 * The `!` chArActer.
	 */
	ExclAmAtionMArk = 33,
	/**
	 * The `"` chArActer.
	 */
	DoubleQuote = 34,
	/**
	 * The `#` chArActer.
	 */
	HAsh = 35,
	/**
	 * The `$` chArActer.
	 */
	DollArSign = 36,
	/**
	 * The `%` chArActer.
	 */
	PercentSign = 37,
	/**
	 * The `&` chArActer.
	 */
	AmpersAnd = 38,
	/**
	 * The `'` chArActer.
	 */
	SingleQuote = 39,
	/**
	 * The `(` chArActer.
	 */
	OpenPAren = 40,
	/**
	 * The `)` chArActer.
	 */
	ClosePAren = 41,
	/**
	 * The `*` chArActer.
	 */
	Asterisk = 42,
	/**
	 * The `+` chArActer.
	 */
	Plus = 43,
	/**
	 * The `,` chArActer.
	 */
	CommA = 44,
	/**
	 * The `-` chArActer.
	 */
	DAsh = 45,
	/**
	 * The `.` chArActer.
	 */
	Period = 46,
	/**
	 * The `/` chArActer.
	 */
	SlAsh = 47,

	Digit0 = 48,
	Digit1 = 49,
	Digit2 = 50,
	Digit3 = 51,
	Digit4 = 52,
	Digit5 = 53,
	Digit6 = 54,
	Digit7 = 55,
	Digit8 = 56,
	Digit9 = 57,

	/**
	 * The `:` chArActer.
	 */
	Colon = 58,
	/**
	 * The `;` chArActer.
	 */
	Semicolon = 59,
	/**
	 * The `<` chArActer.
	 */
	LessThAn = 60,
	/**
	 * The `=` chArActer.
	 */
	EquAls = 61,
	/**
	 * The `>` chArActer.
	 */
	GreAterThAn = 62,
	/**
	 * The `?` chArActer.
	 */
	QuestionMArk = 63,
	/**
	 * The `@` chArActer.
	 */
	AtSign = 64,

	A = 65,
	B = 66,
	C = 67,
	D = 68,
	E = 69,
	F = 70,
	G = 71,
	H = 72,
	I = 73,
	J = 74,
	K = 75,
	L = 76,
	M = 77,
	N = 78,
	O = 79,
	P = 80,
	Q = 81,
	R = 82,
	S = 83,
	T = 84,
	U = 85,
	V = 86,
	W = 87,
	X = 88,
	Y = 89,
	Z = 90,

	/**
	 * The `[` chArActer.
	 */
	OpenSquAreBrAcket = 91,
	/**
	 * The `\` chArActer.
	 */
	BAckslAsh = 92,
	/**
	 * The `]` chArActer.
	 */
	CloseSquAreBrAcket = 93,
	/**
	 * The `^` chArActer.
	 */
	CAret = 94,
	/**
	 * The `_` chArActer.
	 */
	Underline = 95,
	/**
	 * The ``(`)`` chArActer.
	 */
	BAckTick = 96,

	A = 97,
	b = 98,
	c = 99,
	d = 100,
	e = 101,
	f = 102,
	g = 103,
	h = 104,
	i = 105,
	j = 106,
	k = 107,
	l = 108,
	m = 109,
	n = 110,
	o = 111,
	p = 112,
	q = 113,
	r = 114,
	s = 115,
	t = 116,
	u = 117,
	v = 118,
	w = 119,
	x = 120,
	y = 121,
	z = 122,

	/**
	 * The `{` chArActer.
	 */
	OpenCurlyBrAce = 123,
	/**
	 * The `|` chArActer.
	 */
	Pipe = 124,
	/**
	 * The `}` chArActer.
	 */
	CloseCurlyBrAce = 125,
	/**
	 * The `~` chArActer.
	 */
	Tilde = 126,

	U_Combining_GrAve_Accent = 0x0300,								//	U+0300	Combining GrAve Accent
	U_Combining_Acute_Accent = 0x0301,								//	U+0301	Combining Acute Accent
	U_Combining_Circumflex_Accent = 0x0302,							//	U+0302	Combining Circumflex Accent
	U_Combining_Tilde = 0x0303,										//	U+0303	Combining Tilde
	U_Combining_MAcron = 0x0304,									//	U+0304	Combining MAcron
	U_Combining_Overline = 0x0305,									//	U+0305	Combining Overline
	U_Combining_Breve = 0x0306,										//	U+0306	Combining Breve
	U_Combining_Dot_Above = 0x0307,									//	U+0307	Combining Dot Above
	U_Combining_DiAeresis = 0x0308,									//	U+0308	Combining DiAeresis
	U_Combining_Hook_Above = 0x0309,								//	U+0309	Combining Hook Above
	U_Combining_Ring_Above = 0x030A,								//	U+030A	Combining Ring Above
	U_Combining_Double_Acute_Accent = 0x030B,						//	U+030B	Combining Double Acute Accent
	U_Combining_CAron = 0x030C,										//	U+030C	Combining CAron
	U_Combining_VerticAl_Line_Above = 0x030D,						//	U+030D	Combining VerticAl Line Above
	U_Combining_Double_VerticAl_Line_Above = 0x030E,				//	U+030E	Combining Double VerticAl Line Above
	U_Combining_Double_GrAve_Accent = 0x030F,						//	U+030F	Combining Double GrAve Accent
	U_Combining_CAndrAbindu = 0x0310,								//	U+0310	Combining CAndrAbindu
	U_Combining_Inverted_Breve = 0x0311,							//	U+0311	Combining Inverted Breve
	U_Combining_Turned_CommA_Above = 0x0312,						//	U+0312	Combining Turned CommA Above
	U_Combining_CommA_Above = 0x0313,								//	U+0313	Combining CommA Above
	U_Combining_Reversed_CommA_Above = 0x0314,						//	U+0314	Combining Reversed CommA Above
	U_Combining_CommA_Above_Right = 0x0315,							//	U+0315	Combining CommA Above Right
	U_Combining_GrAve_Accent_Below = 0x0316,						//	U+0316	Combining GrAve Accent Below
	U_Combining_Acute_Accent_Below = 0x0317,						//	U+0317	Combining Acute Accent Below
	U_Combining_Left_TAck_Below = 0x0318,							//	U+0318	Combining Left TAck Below
	U_Combining_Right_TAck_Below = 0x0319,							//	U+0319	Combining Right TAck Below
	U_Combining_Left_Angle_Above = 0x031A,							//	U+031A	Combining Left Angle Above
	U_Combining_Horn = 0x031B,										//	U+031B	Combining Horn
	U_Combining_Left_HAlf_Ring_Below = 0x031C,						//	U+031C	Combining Left HAlf Ring Below
	U_Combining_Up_TAck_Below = 0x031D,								//	U+031D	Combining Up TAck Below
	U_Combining_Down_TAck_Below = 0x031E,							//	U+031E	Combining Down TAck Below
	U_Combining_Plus_Sign_Below = 0x031F,							//	U+031F	Combining Plus Sign Below
	U_Combining_Minus_Sign_Below = 0x0320,							//	U+0320	Combining Minus Sign Below
	U_Combining_PAlAtAlized_Hook_Below = 0x0321,					//	U+0321	Combining PAlAtAlized Hook Below
	U_Combining_Retroflex_Hook_Below = 0x0322,						//	U+0322	Combining Retroflex Hook Below
	U_Combining_Dot_Below = 0x0323,									//	U+0323	Combining Dot Below
	U_Combining_DiAeresis_Below = 0x0324,							//	U+0324	Combining DiAeresis Below
	U_Combining_Ring_Below = 0x0325,								//	U+0325	Combining Ring Below
	U_Combining_CommA_Below = 0x0326,								//	U+0326	Combining CommA Below
	U_Combining_CedillA = 0x0327,									//	U+0327	Combining CedillA
	U_Combining_Ogonek = 0x0328,									//	U+0328	Combining Ogonek
	U_Combining_VerticAl_Line_Below = 0x0329,						//	U+0329	Combining VerticAl Line Below
	U_Combining_Bridge_Below = 0x032A,								//	U+032A	Combining Bridge Below
	U_Combining_Inverted_Double_Arch_Below = 0x032B,				//	U+032B	Combining Inverted Double Arch Below
	U_Combining_CAron_Below = 0x032C,								//	U+032C	Combining CAron Below
	U_Combining_Circumflex_Accent_Below = 0x032D,					//	U+032D	Combining Circumflex Accent Below
	U_Combining_Breve_Below = 0x032E,								//	U+032E	Combining Breve Below
	U_Combining_Inverted_Breve_Below = 0x032F,						//	U+032F	Combining Inverted Breve Below
	U_Combining_Tilde_Below = 0x0330,								//	U+0330	Combining Tilde Below
	U_Combining_MAcron_Below = 0x0331,								//	U+0331	Combining MAcron Below
	U_Combining_Low_Line = 0x0332,									//	U+0332	Combining Low Line
	U_Combining_Double_Low_Line = 0x0333,							//	U+0333	Combining Double Low Line
	U_Combining_Tilde_OverlAy = 0x0334,								//	U+0334	Combining Tilde OverlAy
	U_Combining_Short_Stroke_OverlAy = 0x0335,						//	U+0335	Combining Short Stroke OverlAy
	U_Combining_Long_Stroke_OverlAy = 0x0336,						//	U+0336	Combining Long Stroke OverlAy
	U_Combining_Short_Solidus_OverlAy = 0x0337,						//	U+0337	Combining Short Solidus OverlAy
	U_Combining_Long_Solidus_OverlAy = 0x0338,						//	U+0338	Combining Long Solidus OverlAy
	U_Combining_Right_HAlf_Ring_Below = 0x0339,						//	U+0339	Combining Right HAlf Ring Below
	U_Combining_Inverted_Bridge_Below = 0x033A,						//	U+033A	Combining Inverted Bridge Below
	U_Combining_SquAre_Below = 0x033B,								//	U+033B	Combining SquAre Below
	U_Combining_SeAgull_Below = 0x033C,								//	U+033C	Combining SeAgull Below
	U_Combining_X_Above = 0x033D,									//	U+033D	Combining X Above
	U_Combining_VerticAl_Tilde = 0x033E,							//	U+033E	Combining VerticAl Tilde
	U_Combining_Double_Overline = 0x033F,							//	U+033F	Combining Double Overline
	U_Combining_GrAve_Tone_MArk = 0x0340,							//	U+0340	Combining GrAve Tone MArk
	U_Combining_Acute_Tone_MArk = 0x0341,							//	U+0341	Combining Acute Tone MArk
	U_Combining_Greek_Perispomeni = 0x0342,							//	U+0342	Combining Greek Perispomeni
	U_Combining_Greek_Koronis = 0x0343,								//	U+0343	Combining Greek Koronis
	U_Combining_Greek_DiAlytikA_Tonos = 0x0344,						//	U+0344	Combining Greek DiAlytikA Tonos
	U_Combining_Greek_YpogegrAmmeni = 0x0345,						//	U+0345	Combining Greek YpogegrAmmeni
	U_Combining_Bridge_Above = 0x0346,								//	U+0346	Combining Bridge Above
	U_Combining_EquAls_Sign_Below = 0x0347,							//	U+0347	Combining EquAls Sign Below
	U_Combining_Double_VerticAl_Line_Below = 0x0348,				//	U+0348	Combining Double VerticAl Line Below
	U_Combining_Left_Angle_Below = 0x0349,							//	U+0349	Combining Left Angle Below
	U_Combining_Not_Tilde_Above = 0x034A,							//	U+034A	Combining Not Tilde Above
	U_Combining_Homothetic_Above = 0x034B,							//	U+034B	Combining Homothetic Above
	U_Combining_Almost_EquAl_To_Above = 0x034C,						//	U+034C	Combining Almost EquAl To Above
	U_Combining_Left_Right_Arrow_Below = 0x034D,					//	U+034D	Combining Left Right Arrow Below
	U_Combining_UpwArds_Arrow_Below = 0x034E,						//	U+034E	Combining UpwArds Arrow Below
	U_Combining_GrApheme_Joiner = 0x034F,							//	U+034F	Combining GrApheme Joiner
	U_Combining_Right_ArrowheAd_Above = 0x0350,						//	U+0350	Combining Right ArrowheAd Above
	U_Combining_Left_HAlf_Ring_Above = 0x0351,						//	U+0351	Combining Left HAlf Ring Above
	U_Combining_FermAtA = 0x0352,									//	U+0352	Combining FermAtA
	U_Combining_X_Below = 0x0353,									//	U+0353	Combining X Below
	U_Combining_Left_ArrowheAd_Below = 0x0354,						//	U+0354	Combining Left ArrowheAd Below
	U_Combining_Right_ArrowheAd_Below = 0x0355,						//	U+0355	Combining Right ArrowheAd Below
	U_Combining_Right_ArrowheAd_And_Up_ArrowheAd_Below = 0x0356,	//	U+0356	Combining Right ArrowheAd And Up ArrowheAd Below
	U_Combining_Right_HAlf_Ring_Above = 0x0357,						//	U+0357	Combining Right HAlf Ring Above
	U_Combining_Dot_Above_Right = 0x0358,							//	U+0358	Combining Dot Above Right
	U_Combining_Asterisk_Below = 0x0359,							//	U+0359	Combining Asterisk Below
	U_Combining_Double_Ring_Below = 0x035A,							//	U+035A	Combining Double Ring Below
	U_Combining_ZigzAg_Above = 0x035B,								//	U+035B	Combining ZigzAg Above
	U_Combining_Double_Breve_Below = 0x035C,						//	U+035C	Combining Double Breve Below
	U_Combining_Double_Breve = 0x035D,								//	U+035D	Combining Double Breve
	U_Combining_Double_MAcron = 0x035E,								//	U+035E	Combining Double MAcron
	U_Combining_Double_MAcron_Below = 0x035F,						//	U+035F	Combining Double MAcron Below
	U_Combining_Double_Tilde = 0x0360,								//	U+0360	Combining Double Tilde
	U_Combining_Double_Inverted_Breve = 0x0361,						//	U+0361	Combining Double Inverted Breve
	U_Combining_Double_RightwArds_Arrow_Below = 0x0362,				//	U+0362	Combining Double RightwArds Arrow Below
	U_Combining_LAtin_SmAll_Letter_A = 0x0363, 						//	U+0363	Combining LAtin SmAll Letter A
	U_Combining_LAtin_SmAll_Letter_E = 0x0364, 						//	U+0364	Combining LAtin SmAll Letter E
	U_Combining_LAtin_SmAll_Letter_I = 0x0365, 						//	U+0365	Combining LAtin SmAll Letter I
	U_Combining_LAtin_SmAll_Letter_O = 0x0366, 						//	U+0366	Combining LAtin SmAll Letter O
	U_Combining_LAtin_SmAll_Letter_U = 0x0367, 						//	U+0367	Combining LAtin SmAll Letter U
	U_Combining_LAtin_SmAll_Letter_C = 0x0368, 						//	U+0368	Combining LAtin SmAll Letter C
	U_Combining_LAtin_SmAll_Letter_D = 0x0369, 						//	U+0369	Combining LAtin SmAll Letter D
	U_Combining_LAtin_SmAll_Letter_H = 0x036A, 						//	U+036A	Combining LAtin SmAll Letter H
	U_Combining_LAtin_SmAll_Letter_M = 0x036B, 						//	U+036B	Combining LAtin SmAll Letter M
	U_Combining_LAtin_SmAll_Letter_R = 0x036C, 						//	U+036C	Combining LAtin SmAll Letter R
	U_Combining_LAtin_SmAll_Letter_T = 0x036D, 						//	U+036D	Combining LAtin SmAll Letter T
	U_Combining_LAtin_SmAll_Letter_V = 0x036E, 						//	U+036E	Combining LAtin SmAll Letter V
	U_Combining_LAtin_SmAll_Letter_X = 0x036F, 						//	U+036F	Combining LAtin SmAll Letter X

	/**
	 * Unicode ChArActer 'LINE SEPARATOR' (U+2028)
	 * http://www.fileformAt.info/info/unicode/chAr/2028/index.htm
	 */
	LINE_SEPARATOR = 0x2028,
	/**
	 * Unicode ChArActer 'PARAGRAPH SEPARATOR' (U+2029)
	 * http://www.fileformAt.info/info/unicode/chAr/2029/index.htm
	 */
	PARAGRAPH_SEPARATOR = 0x2029,
	/**
	 * Unicode ChArActer 'NEXT LINE' (U+0085)
	 * http://www.fileformAt.info/info/unicode/chAr/0085/index.htm
	 */
	NEXT_LINE = 0x0085,

	// http://www.fileformAt.info/info/unicode/cAtegory/Sk/list.htm
	U_CIRCUMFLEX = 0x005E,									// U+005E	CIRCUMFLEX
	U_GRAVE_ACCENT = 0x0060,								// U+0060	GRAVE ACCENT
	U_DIAERESIS = 0x00A8,									// U+00A8	DIAERESIS
	U_MACRON = 0x00AF,										// U+00AF	MACRON
	U_ACUTE_ACCENT = 0x00B4,								// U+00B4	ACUTE ACCENT
	U_CEDILLA = 0x00B8,										// U+00B8	CEDILLA
	U_MODIFIER_LETTER_LEFT_ARROWHEAD = 0x02C2,				// U+02C2	MODIFIER LETTER LEFT ARROWHEAD
	U_MODIFIER_LETTER_RIGHT_ARROWHEAD = 0x02C3,				// U+02C3	MODIFIER LETTER RIGHT ARROWHEAD
	U_MODIFIER_LETTER_UP_ARROWHEAD = 0x02C4,				// U+02C4	MODIFIER LETTER UP ARROWHEAD
	U_MODIFIER_LETTER_DOWN_ARROWHEAD = 0x02C5,				// U+02C5	MODIFIER LETTER DOWN ARROWHEAD
	U_MODIFIER_LETTER_CENTRED_RIGHT_HALF_RING = 0x02D2,		// U+02D2	MODIFIER LETTER CENTRED RIGHT HALF RING
	U_MODIFIER_LETTER_CENTRED_LEFT_HALF_RING = 0x02D3,		// U+02D3	MODIFIER LETTER CENTRED LEFT HALF RING
	U_MODIFIER_LETTER_UP_TACK = 0x02D4,						// U+02D4	MODIFIER LETTER UP TACK
	U_MODIFIER_LETTER_DOWN_TACK = 0x02D5,					// U+02D5	MODIFIER LETTER DOWN TACK
	U_MODIFIER_LETTER_PLUS_SIGN = 0x02D6,					// U+02D6	MODIFIER LETTER PLUS SIGN
	U_MODIFIER_LETTER_MINUS_SIGN = 0x02D7,					// U+02D7	MODIFIER LETTER MINUS SIGN
	U_BREVE = 0x02D8,										// U+02D8	BREVE
	U_DOT_ABOVE = 0x02D9,									// U+02D9	DOT ABOVE
	U_RING_ABOVE = 0x02DA,									// U+02DA	RING ABOVE
	U_OGONEK = 0x02DB,										// U+02DB	OGONEK
	U_SMALL_TILDE = 0x02DC,									// U+02DC	SMALL TILDE
	U_DOUBLE_ACUTE_ACCENT = 0x02DD,							// U+02DD	DOUBLE ACUTE ACCENT
	U_MODIFIER_LETTER_RHOTIC_HOOK = 0x02DE,					// U+02DE	MODIFIER LETTER RHOTIC HOOK
	U_MODIFIER_LETTER_CROSS_ACCENT = 0x02DF,				// U+02DF	MODIFIER LETTER CROSS ACCENT
	U_MODIFIER_LETTER_EXTRA_HIGH_TONE_BAR = 0x02E5,			// U+02E5	MODIFIER LETTER EXTRA-HIGH TONE BAR
	U_MODIFIER_LETTER_HIGH_TONE_BAR = 0x02E6,				// U+02E6	MODIFIER LETTER HIGH TONE BAR
	U_MODIFIER_LETTER_MID_TONE_BAR = 0x02E7,				// U+02E7	MODIFIER LETTER MID TONE BAR
	U_MODIFIER_LETTER_LOW_TONE_BAR = 0x02E8,				// U+02E8	MODIFIER LETTER LOW TONE BAR
	U_MODIFIER_LETTER_EXTRA_LOW_TONE_BAR = 0x02E9,			// U+02E9	MODIFIER LETTER EXTRA-LOW TONE BAR
	U_MODIFIER_LETTER_YIN_DEPARTING_TONE_MARK = 0x02EA,		// U+02EA	MODIFIER LETTER YIN DEPARTING TONE MARK
	U_MODIFIER_LETTER_YANG_DEPARTING_TONE_MARK = 0x02EB,	// U+02EB	MODIFIER LETTER YANG DEPARTING TONE MARK
	U_MODIFIER_LETTER_UNASPIRATED = 0x02ED,					// U+02ED	MODIFIER LETTER UNASPIRATED
	U_MODIFIER_LETTER_LOW_DOWN_ARROWHEAD = 0x02EF,			// U+02EF	MODIFIER LETTER LOW DOWN ARROWHEAD
	U_MODIFIER_LETTER_LOW_UP_ARROWHEAD = 0x02F0,			// U+02F0	MODIFIER LETTER LOW UP ARROWHEAD
	U_MODIFIER_LETTER_LOW_LEFT_ARROWHEAD = 0x02F1,			// U+02F1	MODIFIER LETTER LOW LEFT ARROWHEAD
	U_MODIFIER_LETTER_LOW_RIGHT_ARROWHEAD = 0x02F2,			// U+02F2	MODIFIER LETTER LOW RIGHT ARROWHEAD
	U_MODIFIER_LETTER_LOW_RING = 0x02F3,					// U+02F3	MODIFIER LETTER LOW RING
	U_MODIFIER_LETTER_MIDDLE_GRAVE_ACCENT = 0x02F4,			// U+02F4	MODIFIER LETTER MIDDLE GRAVE ACCENT
	U_MODIFIER_LETTER_MIDDLE_DOUBLE_GRAVE_ACCENT = 0x02F5,	// U+02F5	MODIFIER LETTER MIDDLE DOUBLE GRAVE ACCENT
	U_MODIFIER_LETTER_MIDDLE_DOUBLE_ACUTE_ACCENT = 0x02F6,	// U+02F6	MODIFIER LETTER MIDDLE DOUBLE ACUTE ACCENT
	U_MODIFIER_LETTER_LOW_TILDE = 0x02F7,					// U+02F7	MODIFIER LETTER LOW TILDE
	U_MODIFIER_LETTER_RAISED_COLON = 0x02F8,				// U+02F8	MODIFIER LETTER RAISED COLON
	U_MODIFIER_LETTER_BEGIN_HIGH_TONE = 0x02F9,				// U+02F9	MODIFIER LETTER BEGIN HIGH TONE
	U_MODIFIER_LETTER_END_HIGH_TONE = 0x02FA,				// U+02FA	MODIFIER LETTER END HIGH TONE
	U_MODIFIER_LETTER_BEGIN_LOW_TONE = 0x02FB,				// U+02FB	MODIFIER LETTER BEGIN LOW TONE
	U_MODIFIER_LETTER_END_LOW_TONE = 0x02FC,				// U+02FC	MODIFIER LETTER END LOW TONE
	U_MODIFIER_LETTER_SHELF = 0x02FD,						// U+02FD	MODIFIER LETTER SHELF
	U_MODIFIER_LETTER_OPEN_SHELF = 0x02FE,					// U+02FE	MODIFIER LETTER OPEN SHELF
	U_MODIFIER_LETTER_LOW_LEFT_ARROW = 0x02FF,				// U+02FF	MODIFIER LETTER LOW LEFT ARROW
	U_GREEK_LOWER_NUMERAL_SIGN = 0x0375,					// U+0375	GREEK LOWER NUMERAL SIGN
	U_GREEK_TONOS = 0x0384,									// U+0384	GREEK TONOS
	U_GREEK_DIALYTIKA_TONOS = 0x0385,						// U+0385	GREEK DIALYTIKA TONOS
	U_GREEK_KORONIS = 0x1FBD,								// U+1FBD	GREEK KORONIS
	U_GREEK_PSILI = 0x1FBF,									// U+1FBF	GREEK PSILI
	U_GREEK_PERISPOMENI = 0x1FC0,							// U+1FC0	GREEK PERISPOMENI
	U_GREEK_DIALYTIKA_AND_PERISPOMENI = 0x1FC1,				// U+1FC1	GREEK DIALYTIKA AND PERISPOMENI
	U_GREEK_PSILI_AND_VARIA = 0x1FCD,						// U+1FCD	GREEK PSILI AND VARIA
	U_GREEK_PSILI_AND_OXIA = 0x1FCE,						// U+1FCE	GREEK PSILI AND OXIA
	U_GREEK_PSILI_AND_PERISPOMENI = 0x1FCF,					// U+1FCF	GREEK PSILI AND PERISPOMENI
	U_GREEK_DASIA_AND_VARIA = 0x1FDD,						// U+1FDD	GREEK DASIA AND VARIA
	U_GREEK_DASIA_AND_OXIA = 0x1FDE,						// U+1FDE	GREEK DASIA AND OXIA
	U_GREEK_DASIA_AND_PERISPOMENI = 0x1FDF,					// U+1FDF	GREEK DASIA AND PERISPOMENI
	U_GREEK_DIALYTIKA_AND_VARIA = 0x1FED,					// U+1FED	GREEK DIALYTIKA AND VARIA
	U_GREEK_DIALYTIKA_AND_OXIA = 0x1FEE,					// U+1FEE	GREEK DIALYTIKA AND OXIA
	U_GREEK_VARIA = 0x1FEF,									// U+1FEF	GREEK VARIA
	U_GREEK_OXIA = 0x1FFD,									// U+1FFD	GREEK OXIA
	U_GREEK_DASIA = 0x1FFE,									// U+1FFE	GREEK DASIA


	U_OVERLINE = 0x203E, // Unicode ChArActer 'OVERLINE'

	/**
	 * UTF-8 BOM
	 * Unicode ChArActer 'ZERO WIDTH NO-BREAK SPACE' (U+FEFF)
	 * http://www.fileformAt.info/info/unicode/chAr/feff/index.htm
	 */
	UTF8_BOM = 65279
}
