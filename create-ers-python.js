    console.log({columns})

#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const { execSync, spawnSync } = require('node:child_process')

const mkdirSync = (filepath) => {
  if (fs.existsSync(filepath)) {
    return
  }
  fs.mkdirSync(filepath, { recursive: true })
  console.log(`created ${filepath}`)
}

const writeFileSync = (filepath, data) => {
  if (fs.existsSync(filepath)) {
    return
  }
  fs.writeFileSync(filepath, data)
  console.log(`created ${filepath}`)
}

const root = process.cwd()
console.log(root)

const package_json_path = path.join(root, 'package.json')

if (fs.existsSync(package_json_path)) {
  console.log('package.json already existed, skip creating')
  process.exit()
}

mkdirSync('src/graphql')
mkdirSync('src/restful')

writeFileSync('src/__init__.py', `
from .restful import restful
from .graphql import schema
`)

writeFileSync('.env.example', `
CLIENT_ID=miner
EADMIN_BASE_URL=http://api.ersinfotech.com/eadmin2-api
`)

writeFileSync('.gitignore', `
env/
__pycache__
.env
`)

writeFileSync('src/graphql/__init__.py', `
import typing
import strawberry
from flask import g

from strawberry.scalars import JSON

@strawberry.type
class Query:
    @strawberry.field
    def echo(json: JSON) -> JSON:
        print(g.session)
        return json

schema = strawberry.Schema(query=Query)
`)

writeFileSync('eadmin.py', `
from flask import request, abort, render_template, redirect, g
import requests
import urllib
import os

eadminUrl = os.getenv('EADMIN_BASE_URL')
client_id = os.getenv('CLIENT_ID')

def access_token_required(fn):
    def wrapper(*args, **kwargs):
        access_token = request.args.get('access_token')
        if access_token is None:
            abort(403, 'access_token required')

        if request.method == 'GET':
            referer = request.headers.get('Referer', '')
            if not referer.endswith('/graphql/login'):
                abort(404)
        params = {
            'access_token': access_token
            }

        try:
            r = requests.get(
                eadminUrl + '/account/me/id',
                params=params,
                timeout=5
                )
            session_data = r.json()
            session_data['access_token'] = access_token
            g.session = session_data
        except Exception as e:
            abort(500, str(e))

        if r.status_code != 200:
            abort(r.status_code, r.text)

        return fn(*args, **kwargs)

    return wrapper


def login():
    if request.method == 'GET':
        return LOGIN_TEMPLATE

    elif request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        json = {
            'email': email,
            'password': password,
            'client_id': client_id,
            }

        try:
            r = requests.post(
                eadminUrl + '/oauth/signin',
                json=json,
                timeout=5
                )
        except Exception as e:
            abort(500, str(e))

        if r.status_code != 200:
            abort(r.status_code, r.text)

        access_token = r.json()['access_token']
        newurl = '../graphql?' + urllib.parse.urlencode({
            'access_token': access_token
            })
        return redirect(newurl)

LOGIN_TEMPLATE = """
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title></title>
    <style type="text/css">
      html,body,div,span,applet,object,iframe,h1,h2,h3,h4,h5,h6,p,blockquote,pre,a,abbr,acronym,address,big,cite,code,del,dfn,em,img,ins,kbd,q,s,samp,small,strike,strong,sub,sup,tt,var,b,u,i,center,dl,dt,dd,ol,ul,li,fieldset,form,label,legend,table,caption,tbody,tfoot,thead,tr,th,td,article,aside,canvas,details,embed,figure,figcaption,footer,header,hgroup,menu,nav,output,ruby,section,summary,time,mark,audio,video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline}article,aside,details,figcaption,figure,footer,header,hgroup,menu,nav,section{display:block}body{line-height:1}ol,ul{list-style:none}blockquote,q{quotes:none}blockquote:before,blockquote:after,q:before,q:after{content:'';content:none}table{border-collapse:collapse;border-spacing:0}
      body {
        background: #e9e9e9;
        font-family: arial, sans-serif;
        text-align: center;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      .form {
        position: relative;
        background: #ffffff;
        width: 285px;
        margin: 40px auto 0;
        padding: 40px;
        border-top: 5px solid #33b5e5;
        -webkit-border-radius: 3px;
        -moz-border-radius: 3px;
        border-radius: 3px;
        -webkit-box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.15);
        -moz-box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.15);
        box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.15);
      }
      .form .switch {
        cursor: pointer;
        position: absolute;
        top: 0;
        right: 0;
        background: #33b5e5;
        width: 30px;
        height: 30px;
        margin: -5px 0 0;
        -webkit-border-radius: 0 3px 0 3px;
        -moz-border-radius: 0 3px 0 3px;
        border-radius: 0 3px 0 3px;
        color: #ffffff;
        font-size: 12px;
        line-height: 30px;
        text-align: center;
      }
      .form .switch .tooltip {
        position: absolute;
        top: 5px;
        right: -65px;
        display: block;
        background: rgba(0, 0, 0, 0.6);
        width: auto;
        padding: 5px;
        -webkit-border-radius: 3px;
        -moz-border-radius: 3px;
        border-radius: 3px;
        color: rgba(255, 255, 255, 0.6);
        font-size: 10px;
        font-weight: 600;
        line-height: 1;
        text-align: left;
        text-transform: uppercase;
      }
      .form .switch .tooltip:before {
        content: '';
        position: absolute;
        top: 5px;
        left: -5px;
        display: block;
        border-top: 5px solid transparent;
        border-bottom: 5px solid transparent;
        border-right: 5px solid rgba(0, 0, 0, 0.6);
      }
      .form .register {
        display: none;
      }
      .form h2 {
        margin: 0 0 20px;
        line-height: 1;
        color: #33b5e5;
        font-size: 18px;
        font-weight: 400;
      }
      .form .alert {
        position: relative;
        background: #f3f3f3;
        color: #666666;
        font-size: 12px;
        margin-bottom: 20px;
        padding: 15px;
        text-align: left;
      }
      .form .alert .fa-times-circle {
        cursor: pointer;
        position: absolute;
        top: 50%;
        right: 10px;
        display: block;
        width: 16px;
        height: 16px;
        line-height: 16px;
        margin-top: -8px;
        float: right;
      }
      .form input {
        outline: none;
        display: block;
        width: 100%;
        margin: 0 0 20px;
        padding: 10px 15px;
        border: 1px solid #d9d9d9;
        -webkit-border-radius: 3px;
        -moz-border-radius: 3px;
        border-radius: 3px;
        color: #ccc;
        font-family: arial;
        -webkti-box-sizing: border-box;
        -moz-box-sizing: border-box;
        box-sizing: border-box;
        font-size: 14px;
        font-wieght: 400;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        -webkit-transition: all 0.3s linear 0s;
        -moz-transition: all 0.3s linear 0s;
        -ms-transition: all 0.3s linear 0s;
        -o-transition: all 0.3s linear 0s;
        transition: all 0.3s linear 0s;
      }
      .form input:focus {
        color: #333333;
        border: 1px solid #33b5e5;
      }
      .form button {
        cursor: pointer;
        background: #33b5e5;
        width: 100%;
        padding: 10px 15px;
        margin-bottom: 25px;
        border: 0;
        -webkit-border-radius: 3px;
        -moz-border-radius: 3px;
        border-radius: 3px;
        color: #ffffff;
        font-family: arial;
        font-size: 14px;
        font-weight: 400;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        -webkit-transition: all 0.3s linear 0s;
        -moz-transition: all 0.3s linear 0s;
        -ms-transition: all 0.3s linear 0s;
        -o-transition: all 0.3s linear 0s;
        transition: all 0.3s linear 0s;
      }
      .form button:hover {
        background: #1a9bcb;
      }
      .form footer {
        background: #f2f2f2;
        width: 100%;
        padding: 15px 40px;
        margin: 0 0 -40px -40px;
        -webkit-border-radius: 0 0 3px 3px;
        -moz-border-radius: 0 0 3px 3px;
        border-radius: 0 0 3px 3px;
        color: #666666;
        font-size: 12px;
        text-align: center;
      }
      .form footer a {
        color: #333333;
        text-decoration: none;
      }
      .info {
        width: 300px;
        margin: 25px auto;
        text-align: center;
      }
      .info h1 {
        margin: 0;
        padding: 0;
        font-size: 24px;
        font-weight: 400;
        color: #333333;
      }
      .info span {
        color: #666666;
        font-size: 12px;
      }
      .info span a {
        color: #000000;
        text-decoration: none;
      }
      .info span .fa {
        color: #33b5e5;
      }
      .info span .spoilers {
        color: #999999;
        margin-top: 5px;
        font-size: 10px;
      }

    </style>
  </head>

  <body>

    <div class='info'>
      <h1 id="title">GraphQL</h1>
    </div>
    <div class='form aniamted bounceIn'>
      <div class='login'>
        <h2>Login To Your Account</h2>
        <form action="login" method="post">
          <input placeholder='Email' type='text' name="email">
          <input placeholder='Password' type='password' name="password">
          <button>Login</button>
        </form>
      </div>
      <footer>
      </footer>
    </div>

    <script type="text/javascript">
      var title = location.hostname.replace(/\\..*$/, '');
      document.title = title;
      document.getElementById('title').innerHTML = title;
    </script>

  </body>
</html>
"""
`)

writeFileSync('requirements.txt', `
flask
flask_cors
strawberry-graphql
waitress
python-dotenv
requests
`)

writeFileSync('src/restful/__init__.py', `
def restful(app):
    @app.route('/hello')
    def hello_world():
       return "hello world"
`)

writeFileSync('ecosystem.config.cjs', `
//
// 只修改env里面的内容即可，其他配置请保持不变
// 专门用于pm2 nvm的联合使用
// 感谢使用
// @fanlia
//

var pkg = require('./package.json')

module.exports = {
  apps : [{
    name      : pkg.name,
    interpreter: "env/bin/python3",
    script : "./server.py",
    env: {
        PORT: 5001,
    },
  }]
}
`)

writeFileSync('install-env.sh', `
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
`)

writeFileSync('app.py', `
from dotenv import load_dotenv

load_dotenv()  # take environment variables from .env.

import os
from flask import Flask
from flask_cors import CORS
from strawberry.flask.views import GraphQLView

from src import schema, restful

import eadmin

app = Flask(__name__)
CORS(app)
app.config['JSON_AS_ASCII'] = False
app.config['JSONIFY_MIMETYPE'] = "application/json;charset=utf-8"

app.add_url_rule(
    '/graphql/login',
    view_func=eadmin.login,
    methods=['GET', 'POST']
)

app.add_url_rule(
    "/graphql",
    view_func=eadmin.access_token_required(GraphQLView.as_view("graphql_view", schema=schema)),
    methods=['GET', 'POST']
)

restful(app)

port = os.getenv('PORT', 5000)

if __name__ == "__main__":
    app.run(port=port)
`)

writeFileSync('server.py', `
import time
import sys
from waitress import serve
from app import app, port
 
print("server started at http://localhost:{} [{}][python:{}]".format(port, time.asctime(), sys.version))
serve(app, host='0.0.0.0', port=port)
`)

execSync('cp .env.example .env')
execSync('npm init -y')

const package = require(package_json_path)
package.scripts.start = 'source env/bin/activate && FLASK_DEBUG=true flask run --host 0.0.0.0'
package.type = 'module'

fs.writeFileSync(package_json_path, JSON.stringify(package, null, 2))

console.log('please wait')

spawnSync('sh', ['./install-env.sh'], { stdio: 'inherit' })

console.log(`\nyou can 'npm start' now`)
