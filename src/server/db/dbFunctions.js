import { randomBytes, createHash } from 'crypto'
import bcrypt from 'bcrypt'
import db from './sqlite'

export function createUser({ name, email, loc = '', pw }) {
  return bcrypt.hash(pw, 10)
    .then(hash => {
      return createEntity('user', { name, email, loc, pw: hash })
    })
}

export function getUserWithId(id) {
  return db.prepare('select id, name, loc from "user" where id = ?').get(id)
}

export function updateUser(id, object) {
  if ('token' in object) {
    if (!object.token) { // object.token == undefined, null, 0, ''
      object.token = null
      object.token_ts = null
      object.token_ts_exp = null
    } else {
      object.token = createHash('md5').update(object.token).digest() // token is stored as hash
      object.token_ts = ~~(Date.now() / 1000)
      if (!object.token_ts_exp) object.token_ts_exp = object.token_ts + 7776000 // 90 days from now
    }
  }
  const keys = Object.keys(object)
  if (!keys.length) return 0
  const conds = keys.map(key => `(${key} != $${key} or ${key} is null or $${key} is null)`).join(' or ')

  const sets = keys.map(key => `${key} = $${key}`)
  const stmt = `update "user" set ${sets} where id = ? and (${conds})`
  return db.prepare(stmt).run(id, object).changes
}

export function getAndUpdateUserFromToken(token) { // like findAndModify from mongo
  // get user from the given token
  // if token not found, return undefined
  // if found, check token_ts and exp, if expired, delete the token and return undefined
  // if found and ts conditions met, create new token_ts_exp and return the user

  if (!token) return undefined
  token = createHash('md5').update(token).digest()
  const user = db.prepare('select id, name, email, loc from "user" where token = ?').get(token)
  if (!user) return undefined

  const now = ~~(Date.now() / 1000)
  if (user.token_ts_exp < now || user.token_ts + 31536000 < now) {
    updateUser({ id: user.id, token: null })
    return undefined
  }

  updateUser(user.id, { token_ts_exp: now + 7776000 }) // extend 90 more days
  return user
}

export function deleteToken(token) {
  if (!token) return undefined
  token = createHash('md5').update(token).digest()
  return db.prepare('update "user" set token = null, token_ts = null, token_ts_exp = null where token = ?').run(token).changes
}


function createEntity(table, object) {
  // return id String, or throw error
  const keys = Object.keys(object)
  const cols = keys.length === 0 ? '' : ', ' + keys
  const values = keys.length === 0 ? '' : ', ' + keys.map(d => '$' + d)

  const stmt = `
    with cte as (select coalesce((select id from "${table}" order by rowid desc limit 1), 10000)
      + abs(random() % 10) + 10 as id)
    insert into "${table}" (id ${cols})
      values ((select id from cte) ${values})
  `
  const { lastInsertROWID } = db.prepare(stmt).run(object)
  return db.prepare(`select id from "${table}" where rowid = ?`).pluck().get(lastInsertROWID)
}