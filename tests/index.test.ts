/**
 * Tests for main entry point CLI argument parsing and transport mode selection
 */

import { describe, it, expect } from 'bun:test';
import { spawn } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(require('node:child_process').exec);

describe('CLI Arguments and Transport Modes', () => {
  const SCRIPT_PATH = '/Users/dennisonbertram/Develop/ModelContextProtocol/web3-stats-server/src/index.ts';

  describe('Version and Help', () => {
    it('should show version with --version flag', async () => {
      const { stdout } = await exec(`bun run ${SCRIPT_PATH} --version`);
      expect(stdout).toContain('MCP Web3 Stats v');
    });

    it('should show help with --help flag', async () => {
      const { stdout } = await exec(`bun run ${SCRIPT_PATH} --help`);
      expect(stdout).toContain('USAGE:');
      expect(stdout).toContain('OPTIONS:');
      expect(stdout).toContain('--transport');
      expect(stdout).toContain('stdio');
      expect(stdout).toContain('http');
      expect(stdout).toContain('sse-legacy');
      expect(stdout).toContain('hybrid');
    });
  });

  describe('Transport Mode Normalization', () => {
    it('should warn when using deprecated "sse" mode and use "http" instead', (done) => {
      const child = spawn('bun', ['run', SCRIPT_PATH, '--transport', 'sse', '--port', '3998'], {
        env: { ...process.env, DUNE_API_KEY: 'test-key' }
      });

      let stderr = '';
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      setTimeout(() => {
        child.kill();
        expect(stderr).toContain('"sse" is deprecated');
        expect(stderr).toContain('Using modern "http" transport');
        expect(stderr).toContain('For legacy SSE support, use --transport sse-legacy');
        done();
      }, 1000);
    });

    it('should start in stdio mode by default', (done) => {
      const child = spawn('bun', ['run', SCRIPT_PATH], {
        env: { ...process.env, DUNE_API_KEY: 'test-key' }
      });

      let stderr = '';
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      setTimeout(() => {
        child.kill();
        expect(stderr).toContain('started and listening on stdio');
        done();
      }, 1000);
    });

    it('should start in http mode with --transport http', (done) => {
      const child = spawn('bun', ['run', SCRIPT_PATH, '--transport', 'http', '--port', '3997'], {
        env: { ...process.env, DUNE_API_KEY: 'test-key' }
      });

      let stderr = '';
      let stdout = '';
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      setTimeout(() => {
        child.kill();
        const output = stderr + stdout;
        expect(output).toContain('modern Streamable HTTP transport');
        done();
      }, 1000);
    });

    it('should start in legacy mode with --transport sse-legacy', (done) => {
      const child = spawn('bun', ['run', SCRIPT_PATH, '--transport', 'sse-legacy', '--port', '3999'], {
        env: { ...process.env, DUNE_API_KEY: 'test-key' }
      });

      let stderr = '';
      let stdout = '';
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      setTimeout(() => {
        child.kill();
        const output = stderr + stdout;
        expect(output).toContain('Using deprecated SSE transport');
        expect(output).toContain('SSE mode');
        done();
      }, 1000);
    });

    it('should start in hybrid mode with --transport hybrid', (done) => {
      const child = spawn('bun', ['run', SCRIPT_PATH, '--transport', 'hybrid', '--port', '3996'], {
        env: { ...process.env, DUNE_API_KEY: 'test-key' }
      });

      let stderr = '';
      let stdout = '';
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      setTimeout(() => {
        child.kill();
        const output = stderr + stdout;
        expect(output).toContain('hybrid HTTP/SSE transport');
        done();
      }, 1000);
    });
  });

  describe('Port Configuration', () => {
    it('should use custom port with --port flag', (done) => {
      const child = spawn('bun', ['run', SCRIPT_PATH, '--transport', 'http', '--port', '8080'], {
        env: { ...process.env, DUNE_API_KEY: 'test-key' }
      });

      let stderr = '';
      let stdout = '';
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      setTimeout(() => {
        child.kill();
        const output = stderr + stdout;
        expect(output).toContain('127.0.0.1:8080');
        done();
      }, 1000);
    });
  });
});