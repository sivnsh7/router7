import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parse } from 'jsonc-parser';
import { afterEach, describe, expect, it } from 'vitest';
import { applyGeneratedFile, applyGeneratedFiles, renderFile } from './config-files.js';

const temporary: string[] = [];

afterEach(() => {
  for (const directory of temporary.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('safe config writes', () => {
  it('writes a fresh env file without a leading blank line', () => {
    const rendered = renderFile({ path: '/unused', format: 'env', content: 'FREELLMAPI_API_KEY=k\n' }, '');
    expect(rendered).toBe('FREELLMAPI_API_KEY=k\n');
    expect(renderFile({ path: '/unused', format: 'env', content: 'FREELLMAPI_API_KEY=k\n' }, rendered)).toBe(rendered);
  });

  it('renders a fresh Continue config idempotently', () => {
    const generated = [
      '# router7:start',
      'name: Router7',
      'version: 1.0.0',
      'schema: v1',
      'models:',
      '  - name: Router7',
      '    provider: openai',
      '    model: coder',
      '# router7:end',
      '',
    ].join('\n');
    const first = renderFile({
      path: '/unused',
      format: 'yaml',
      content: generated,
    });
    const second = renderFile({
      path: '/unused',
      format: 'yaml',
      content: generated,
    }, first);
    expect(second).toBe(first);
    expect(first).not.toContain('router7:start');
    expect(first.match(/^models:$/gm)).toHaveLength(1);
  });

  it('deep-merges JSONC and retains inline and leading comments', () => {
    const existing = [
      '// user configuration',
      '{',
      '  // keep the chosen theme',
      '  "theme": "dark",',
      '  "provider": {',
      '    /* keep the unrelated provider */',
      '    "other": true,',
      '  },',
      '}',
      '',
    ].join('\n');
    const rendered = renderFile({
      path: '/unused',
      format: 'json',
      value: { provider: { router7: true } },
    }, existing);
    expect(rendered).toContain('// user configuration');
    expect(rendered).toContain('// keep the chosen theme');
    expect(rendered).toContain('/* keep the unrelated provider */');
    expect(parse(rendered)).toEqual({
      theme: 'dark',
      provider: { other: true, router7: true },
    });
  });

  it('merges Continue into an existing config without replacing other models', () => {
    const existing = [
      '# personal config',
      'name: Personal',
      'version: 2.0.0',
      'schema: v1',
      'models:',
      '  - name: Existing',
      '    provider: ollama',
      '    model: qwen',
      'rules:',
      '  - Keep this rule',
      '',
    ].join('\n');
    const generated = [
      '# router7:start',
      'name: Router7',
      'version: 1.0.0',
      'schema: v1',
      'models:',
      '  - name: Router7',
      '    provider: openai',
      '    model: coder',
      '# router7:end',
      '',
    ].join('\n');
    const first = renderFile({
      path: '/unused',
      format: 'yaml',
      content: generated,
    }, existing);
    const second = renderFile({
      path: '/unused',
      format: 'yaml',
      content: generated,
    }, first);
    expect(second).toBe(first);
    expect(first).toContain('# personal config');
    expect(first).toContain('name: Personal');
    expect(first).toContain('  - name: Existing');
    expect(first).toContain('  - name: Router7');
    expect(first).toContain('rules:\n  - Keep this rule');
    expect(first.match(/^models:$/gm)).toHaveLength(1);
  });

  it('upgrades a previously marked Continue block without leaving duplicate keys', () => {
    const existing = [
      'name: Personal',
      'version: 2.0.0',
      'schema: v1',
      'models:',
      '  - name: Existing',
      '    provider: ollama',
      '    model: qwen',
      '# router7:start',
      'models:',
      '  - name: Router7',
      '    provider: openai',
      '    model: old',
      '# router7:end',
      '',
    ].join('\n');
    const generated = [
      '# router7:start',
      'name: Router7',
      'version: 1.0.0',
      'schema: v1',
      'models:',
      '  - name: Router7',
      '    provider: openai',
      '    model: current',
      '# router7:end',
      '',
    ].join('\n');
    const rendered = renderFile({
      path: '/unused',
      format: 'yaml',
      content: generated,
    }, existing);
    expect(rendered.match(/^name:/gm)).toHaveLength(1);
    expect(rendered.match(/^version:/gm)).toHaveLength(1);
    expect(rendered.match(/^schema:/gm)).toHaveLength(1);
    expect(rendered.match(/^models:/gm)).toHaveLength(1);
    expect(rendered).toContain('  - name: Existing');
    expect(rendered).toContain('    model: current');
    expect(rendered).not.toContain('    model: old');
  });

  it('replaces generated YAML scalar keys without creating duplicates', () => {
    const existing = '# user config\nGOOSE_PROVIDER: old\nGOOSE_MODEL: old\nkeep: true\n';
    const generated = [
      '# router7:start',
      'GOOSE_PROVIDER: router7',
      'GOOSE_MODEL: coder',
      '# router7:end',
      '',
    ].join('\n');
    const first = renderFile({
      path: '/unused',
      format: 'yaml',
      content: generated,
    }, existing);
    const second = renderFile({
      path: '/unused',
      format: 'yaml',
      content: generated,
    }, first);
    expect(second).toBe(first);
    expect(first).toContain('# user config');
    expect(first).toContain('keep: true');
    expect(first.match(/^GOOSE_PROVIDER:/gm)).toHaveLength(1);
    expect(first.match(/^GOOSE_MODEL:/gm)).toHaveLength(1);
  });

  it('deep-merges structured YAML and retains sibling routes and comments', () => {
    // DeepSeek Harness keeps every provider under one `llm-pi-ai.providers`
    // dict. The marked-block YAML merge removes whole top-level keys it
    // re-emits, which here would delete the user's other providers; the
    // structured merge must touch only the path it sets.
    const existing = [
      '# my settings',
      'llm-pi-ai:',
      '  providers:',
      '    anthropic:',
      '      # keep me',
      '      apiKeyEnv: ANTHROPIC_API_KEY',
      '    router7:',
      '      baseURL: http://old:1/v1',
      '      models:',
      '        - id: stale',
      'agent-default-model:',
      '  provider: anthropic',
      '  model: claude-sonnet-4-5',
      '  reasoningEffort: high',
      'other: { a: 1 }',
      '',
    ].join('\n');
    const file = {
      path: '/tmp/settings.yaml',
      format: 'yaml' as const,
      value: {
        'llm-pi-ai': {
          providers: {
            router7: {
              baseURL: 'http://localhost:3001/v1',
              models: [{ id: 'auto' }],
            },
          },
        },
        'agent-default-model': {
          provider: 'router7',
          model: 'auto',
          reasoningEffort: undefined,
        },
      },
    };
    const once = renderFile(file, existing);
    expect(once).toContain('# my settings');
    expect(once).toContain('# keep me');
    expect(once).toContain('apiKeyEnv: ANTHROPIC_API_KEY');
    expect(once).toContain('baseURL: http://localhost:3001/v1');
    expect(once).not.toContain('http://old:1/v1');
    expect(once).not.toContain('stale');
    expect(once).toContain('provider: router7');
    expect(once).not.toContain('reasoningEffort');
    expect(once).toContain('other: { a: 1 }');
    expect(renderFile(file, once)).toBe(once);
  });

  it('renders structured YAML from an empty or comment-only document', () => {
    const file = {
      path: '/tmp/settings.yaml',
      format: 'yaml' as const,
      value: { a: { b: [1, 2] }, c: undefined },
    };
    expect(renderFile(file, '')).toBe('a:\n  b:\n    - 1\n    - 2\n');
    expect(renderFile(file, '# only a comment\n')).toContain('a:\n  b:\n    - 1\n    - 2\n');
  });

  it('refuses to merge structured YAML into a document it cannot parse', () => {
    const file = {
      path: '/tmp/settings.yaml',
      format: 'yaml' as const,
      value: { a: 1 },
    };
    expect(() => renderFile(file, 'a: [1, 2\n')).toThrow(/cannot be parsed/);
    expect(() => renderFile(file, '- just\n- a list\n')).toThrow(/not a mapping/);
  });

  it('replaces conflicting Codex TOML settings and retains unrelated tables', () => {
    const existing = [
      '# personal config',
      'model = "old"',
      'model_provider = "old"',
      '',
      '[model_providers.router7]',
      'name = "Old"',
      'base_url = "https://old.invalid/v1"',
      '',
      '[mcp_servers.personal]',
      'command = "keep-me"',
      '',
    ].join('\n');
    const generated = [
      '# router7:start',
      'model = "coder"',
      'model_provider = "router7"',
      '',
      '[model_providers.router7]',
      'name = "Router7"',
      'base_url = "http://localhost:3000/v1"',
      '# router7:end',
      '',
    ].join('\n');
    const first = renderFile({
      path: '/unused',
      format: 'toml',
      content: generated,
    }, existing);
    const second = renderFile({
      path: '/unused',
      format: 'toml',
      content: generated,
    }, first);
    expect(second).toBe(first);
    expect(first).toContain('# personal config');
    expect(first).toContain('[mcp_servers.personal]\ncommand = "keep-me"');
    expect(first.match(/^model =/gm)).toHaveLength(1);
    expect(first.match(/^\[model_providers\.router7\]$/gm)).toHaveLength(1);
  });

  it('keeps generated root TOML keys in the root region when the file ends in a table', () => {
    const existing = [
      '# personal config',
      'sandbox_mode = "workspace-write"',
      '',
      '[mcp_servers.personal]',
      'command = "keep-me"',
      'args = ["--serve"]',
      '',
    ].join('\n');
    const generated = [
      '# router7:start',
      'model = "coder"',
      'model_provider = "router7"',
      '',
      '[model_providers.router7]',
      'name = "Router7"',
      'base_url = "http://localhost:3000/v1"',
      '# router7:end',
      '',
    ].join('\n');
    const first = renderFile({
      path: '/unused',
      format: 'toml',
      content: generated,
    }, existing);
    const second = renderFile({
      path: '/unused',
      format: 'toml',
      content: generated,
    }, first);
    expect(second).toBe(first);

    // Root-level keys must appear BEFORE the first table header, otherwise
    // TOML assigns them to that table.
    const lines = first.split('\n');
    const firstHeader = lines.findIndex(line => /^\[[^\]]+\]$/.test(line));
    const modelLine = lines.findIndex(line => line === 'model = "coder"');
    const providerLine = lines.findIndex(line => line === 'model_provider = "router7"');
    expect(firstHeader).toBeGreaterThan(-1);
    expect(modelLine).toBeGreaterThan(-1);
    expect(modelLine).toBeLessThan(firstHeader);
    expect(providerLine).toBeGreaterThan(-1);
    expect(providerLine).toBeLessThan(firstHeader);
    expect(first).toContain('sandbox_mode = "workspace-write"');
    expect(first).toContain('[mcp_servers.personal]\ncommand = "keep-me"\nargs = ["--serve"]');
    expect(first).toContain('[model_providers.router7]');
  });

  it('only strips root TOML keys that the generated root region sets', () => {
    const existing = [
      'name = "my personal codex"',
      'model = "old"',
      '',
      '[mcp_servers.personal]',
      'command = "keep-me"',
      '',
    ].join('\n');
    const generated = [
      '# router7:start',
      'model = "coder"',
      '',
      '[model_providers.router7]',
      'name = "Router7"',
      '# router7:end',
      '',
    ].join('\n');
    const first = renderFile({
      path: '/unused',
      format: 'toml',
      content: generated,
    }, existing);
    // The generated TABLE sets `name`, but the user's ROOT-level `name` is a
    // different key and must survive.
    expect(first).toContain('name = "my personal codex"');
    expect(first.match(/^model =/gm)).toHaveLength(1);
    expect(first).toContain('model = "coder"');
  });

  it('does not write any file when a later file in the batch fails to merge', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'router7-cli-'));
    temporary.push(directory);
    const good = path.join(directory, 'good.json');
    const bad = path.join(directory, 'bad.json');
    fs.writeFileSync(bad, '{ this is not json');
    expect(() => applyGeneratedFiles([
      { path: good, format: 'json', value: { enabled: true } },
      { path: bad, format: 'json', value: { enabled: true } },
    ], false)).toThrow('cannot be parsed safely');
    expect(fs.existsSync(good)).toBe(false);
    expect(fs.readFileSync(bad, 'utf8')).toBe('{ this is not json');
  });

  it('merges an AtomCode config: root key above existing tables, other providers kept', () => {
    // A user with a DeepSeek provider already configured runs setup-atomcode:
    // `default_provider` must land in the root region (a key appended after
    // `[providers.deepseek]` would become that table's key), the deepseek
    // table must survive, and a stale `[providers.router7]` is replaced.
    const existing = [
      'default_provider = "deepseek"',
      'auto_update = true',
      '',
      '[providers.deepseek]',
      'type = "openai"',
      'api_key = "sk-keep"',
      'model = "deepseek-chat"',
      '',
      '[providers.router7]',
      'type = "openai"',
      'model = "stale-model"',
      '',
    ].join('\n');
    const generated = [
      'default_provider = "router7"',
      '',
      '[providers.router7]',
      'type = "openai"',
      'base_url = "http://localhost:3000/v1"',
      'api_key = "router7-test-key"',
      'model = "fast-coder"',
      'context_window = 131072',
    ].join('\n');
    const merged = renderFile({ path: '/unused', format: 'toml', content: generated }, existing);
    const lines = merged.split('\n');
    const firstTable = lines.findIndex(line => line.startsWith('['));
    expect(lines.slice(0, firstTable)).toContain('default_provider = "router7"');
    expect(lines.slice(0, firstTable)).toContain('auto_update = true');
    expect(merged.match(/^default_provider =/gm)).toHaveLength(1);
    expect(merged).toContain('[providers.deepseek]\ntype = "openai"\napi_key = "sk-keep"');
    expect(merged.match(/^\[providers\.router7\]$/gm)).toHaveLength(1);
    expect(merged).not.toContain('stale-model');
    expect(merged).toContain('context_window = 131072');
    expect(renderFile({ path: '/unused', format: 'toml', content: generated }, merged)).toBe(merged);
  });

  it('creates a timestamped backup before replacing a real file', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'router7-cli-'));
    temporary.push(directory);
    const target = path.join(directory, 'config.toml');
    fs.writeFileSync(target, 'user_setting = true\n');
    const result = applyGeneratedFile({
      path: target,
      format: 'toml',
      content: '# router7:start\nmodel = "auto"\n# router7:end\n',
    }, false);
    expect(result.backupPath).toBeTruthy();
    expect(fs.readFileSync(result.backupPath!, 'utf8')).toBe('user_setting = true\n');
    expect(fs.readFileSync(target, 'utf8')).toContain('user_setting = true');
    expect(fs.readFileSync(target, 'utf8')).toContain('model = "auto"');
  });

  it('does not write in dry-run mode', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'router7-cli-'));
    temporary.push(directory);
    const target = path.join(directory, 'new.json');
    const result = applyGeneratedFile({
      path: target,
      format: 'json',
      value: { enabled: true },
    }, true);
    expect(result.changed).toBe(true);
    expect(fs.existsSync(target)).toBe(false);
  });
});
