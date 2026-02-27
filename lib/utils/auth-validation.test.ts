import {
  PASSWORD_REGEX,
  PASSWORD_ERROR_MESSAGE,
  passwordSchema,
  validatePassword,
} from './auth-validation';

// ---------------------------------------------------------------------------
// PASSWORD_REGEX – direct regex tests
// ---------------------------------------------------------------------------
describe('PASSWORD_REGEX', () => {
  const valid = [
    'Abcdef1!',         // minimal valid
    'Password1@',       // classic special chars
    'Test1234#',        // hash
    'Hello1_World',     // underscore
    'Foo1bar~Baz',      // tilde
    'My Pass1!',        // space (NIST passphrase support)
    'Complex1^pwd',     // caret
    'Str0ng(pwd)',      // parens
    'Valid1.password',  // dot
    'Good1-Password',   // hyphen
    'Key1+Value',       // plus
    'Pipe1|Test',       // pipe
    'Back1\\Slash',     // backslash
    'Curly1{brace}',    // curly braces
    'Square1[bracket]', // square brackets
    'Semi1;colon',      // semicolon
    'Colon1:test',      // colon
    "Quote1'test",      // single quote
    'Quote1"test',      // double quote
    'Comma1,test',      // comma
    'Less1<greater>',   // angle brackets
    'Slash1/test',      // forward slash
    'At1@sign',         // @
    'Dollar1$sign',     // $
    'Exclaim1!mark',    // !
    'Percent1%sign',    // %
    'Aster1*isk',       // *
    'Question1?mark',   // ?
    'Amper1&sand',      // &
    'Equal1=sign',      // equals
    'Tick1`mark',       // backtick
  ];

  it.each(valid)('accepts "%s"', (pw) => {
    expect(PASSWORD_REGEX.test(pw)).toBe(true);
  });

  const invalid = [
    '',                  // empty
    'short1!',           // too short (7 chars – missing uppercase counted separately but length matters)
    'Ab1!',              // too short
    'abcdefgh1!',        // no uppercase
    'ABCDEFGH1!',        // no lowercase
    'Abcdefgh!',         // no digit
    'Abcdefgh1',         // no special character
    '12345678',          // digits only
    'abcdefgh',          // lowercase only
    'ABCDEFGH',          // uppercase only
  ];

  it.each(invalid)('rejects "%s"', (pw) => {
    expect(PASSWORD_REGEX.test(pw)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validatePassword – helper function tests
// ---------------------------------------------------------------------------
describe('validatePassword', () => {
  it('returns isValid: true for a valid password', () => {
    expect(validatePassword('StrongP@ss1')).toEqual({ isValid: true });
  });

  it('returns a length error for passwords under 8 characters', () => {
    const result = validatePassword('Ab1!');
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/at least 8 characters/);
  });

  it('returns the complexity error when regex fails', () => {
    const result = validatePassword('alllowercase1');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(PASSWORD_ERROR_MESSAGE);
  });

  it('accepts passwords with spaces (passphrase)', () => {
    expect(validatePassword('My P@ss 1word')).toEqual({ isValid: true });
  });
});

// ---------------------------------------------------------------------------
// passwordSchema – Zod schema tests
// ---------------------------------------------------------------------------
describe('passwordSchema', () => {
  it('parses a valid password', () => {
    expect(passwordSchema.parse('Valid1!Password')).toBe('Valid1!Password');
  });

  it('throws on an invalid password', () => {
    expect(() => passwordSchema.parse('bad')).toThrow();
  });

  it('does NOT trim the value (preserves spaces)', () => {
    const pw = '  Spaced1! ';
    expect(passwordSchema.parse(pw)).toBe(pw);
  });
});
