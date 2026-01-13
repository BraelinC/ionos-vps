/**
 * Run Command - Terminal automation helper
 *
 * Executes shell commands and captures output.
 * Can be used standalone or as a module.
 *
 * Usage (CLI):
 *   node run_command.js "npm install"
 *   node run_command.js "bunx vite --host" --cwd /home/user/project
 *   node run_command.js "bunx convex dev" --stream
 *
 * Usage (Module):
 *   const { runCommand, runCommandStream } = require('./run_command');
 *   const result = await runCommand('npm install', { cwd: '/path/to/project' });
 */

const { spawn } = require('child_process');
const path = require('path');

/**
 * Run a command and capture output
 * @param {string} cmd - Command to run
 * @param {Object} options - Options
 * @param {string} options.cwd - Working directory
 * @param {boolean} options.stream - Stream output to console
 * @param {number} options.timeout - Timeout in ms (default: 60000)
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
function runCommand(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    const result = { stdout: '', stderr: '', code: null, timedOut: false };
    const startTime = Date.now();

    const proc = spawn(cmd, [], {
      shell: true,
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env }
    });

    let timeoutId;
    if (options.timeout) {
      timeoutId = setTimeout(() => {
        result.timedOut = true;
        proc.kill('SIGTERM');
      }, options.timeout);
    }

    proc.stdout.on('data', d => {
      result.stdout += d.toString();
      if (options.stream) process.stdout.write(d);
    });

    proc.stderr.on('data', d => {
      result.stderr += d.toString();
      if (options.stream) process.stderr.write(d);
    });

    proc.on('close', code => {
      if (timeoutId) clearTimeout(timeoutId);
      result.code = code;
      result.duration = Date.now() - startTime;
      resolve(result);
    });

    proc.on('error', err => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(err);
    });
  });
}

/**
 * Run a command with streaming output (convenience wrapper)
 */
function runCommandStream(cmd, options = {}) {
  return runCommand(cmd, { ...options, stream: true });
}

/**
 * Run multiple commands in sequence
 * @param {string[]} commands - Array of commands
 * @param {Object} options - Options passed to each command
 * @returns {Promise<Array>} Array of results
 */
async function runCommands(commands, options = {}) {
  const results = [];
  for (const cmd of commands) {
    const result = await runCommand(cmd, options);
    results.push({ cmd, ...result });
    if (result.code !== 0 && !options.continueOnError) {
      break;
    }
  }
  return results;
}

/**
 * Start a long-running process in background
 * @param {string} cmd - Command to run
 * @param {Object} options - Options
 * @returns {ChildProcess} The spawned process
 */
function startBackground(cmd, options = {}) {
  const proc = spawn(cmd, [], {
    shell: true,
    cwd: options.cwd || process.cwd(),
    env: { ...process.env, ...options.env },
    detached: true,
    stdio: options.stdio || 'pipe'
  });

  if (options.onStdout) {
    proc.stdout?.on('data', options.onStdout);
  }
  if (options.onStderr) {
    proc.stderr?.on('data', options.onStderr);
  }

  return proc;
}

// Export for module usage
module.exports = {
  runCommand,
  runCommandStream,
  runCommands,
  startBackground
};

// CLI mode
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node run_command.js <command> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --cwd <path>     Working directory');
    console.log('  --stream         Stream output to console');
    console.log('  --timeout <ms>   Timeout in milliseconds');
    console.log('');
    console.log('Examples:');
    console.log('  node run_command.js "npm install"');
    console.log('  node run_command.js "bunx vite" --cwd /home/user/project --stream');
    process.exit(0);
  }

  // Parse args
  const options = {};
  let cmd = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cwd' && args[i + 1]) {
      options.cwd = args[++i];
    } else if (args[i] === '--stream') {
      options.stream = true;
    } else if (args[i] === '--timeout' && args[i + 1]) {
      options.timeout = parseInt(args[++i]);
    } else if (!cmd) {
      cmd = args[i];
    }
  }

  if (!cmd) {
    console.error('Error: No command specified');
    process.exit(1);
  }

  console.log(`Running: ${cmd}`);
  if (options.cwd) console.log(`In: ${options.cwd}`);
  console.log('');

  runCommand(cmd, options)
    .then(result => {
      if (!options.stream) {
        if (result.stdout) console.log('STDOUT:\n' + result.stdout);
        if (result.stderr) console.log('STDERR:\n' + result.stderr);
      }
      console.log(`\nExit code: ${result.code}`);
      console.log(`Duration: ${result.duration}ms`);
      if (result.timedOut) console.log('(Timed out)');
      process.exit(result.code || 0);
    })
    .catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}
