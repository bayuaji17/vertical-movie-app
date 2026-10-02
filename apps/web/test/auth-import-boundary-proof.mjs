import assert from 'node:assert/strict'
const app = import.meta.dir.replace(/\/test$/, '')
const target = `${app}/src/routes/admin.login.tsx`
const original = await Bun.file(target).text()
try {
  await Bun.write(
    target,
    original +
      '\nimport { createAdminAuthServer } from "@repo/auth/server"\nconsole.log(createAdminAuthServer)\n',
  )
  const process = Bun.spawn([Bun.which('bun'), 'run', 'build'], {
    cwd: app,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [code, stdout, stderr] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ])
  assert.notEqual(code, 0, 'illegal server import must fail the client build')
  assert.match(stdout + stderr, /@repo\/auth\/server/)
  assert.match(
    stdout + stderr,
    /[Ii]mport.*protection|[Ii]mport.*denied|[Dd]isallowed|[Ss]erver-only/,
  )
  console.log('Client build rejected @repo/auth/server; fixture restored.')
} finally {
  await Bun.write(target, original)
}
