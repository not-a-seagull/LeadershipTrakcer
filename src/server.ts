// BSD LICENSE - c John Nunley and Larson Rivera

// contains the express erver to run

import * as bodyParser from 'body-parser';
import * as cookieParser from "cookie-parser";
import * as express from 'express';
import * as fs from 'fs';
import * as https from 'https';
import * as path from "path";

import { Belt, parseBelt } from "./belt";
import { checkUsernameUsage, checkEmailUsage } from "./users/check-existence";
import { emailRegex, Nullable } from "./utils";
import { initializeSchema } from './schema';
import { readFile } from "./promises";
import { render } from "./render";
import { SessionTable } from "./users/sessions";
import { Student } from "./student";
import { User } from "./users";

import getDiagram from "./pages/diagram";

const sessionTable = new SessionTable();

function getUsername(req: express.Request): Nullable<string> {
  const sessionId = req.cookies["sessionId"];
  if (!sessionId) return null;

  const user = sessionTable.checkSession(sessionId);
  if (user) return user.username;
  else return null;
}

// main function
export async function getServer(): Promise<express.Application> {
  // initialize schema
  await initializeSchema();

  // initialize express.js
  const app = express();
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());

  // get bundled frontend script
  app.get("/bundle.js", async function(req: express.Request, res: express.Response) {
    const bundle = await readFile("dist/bundle.js"); // should be in dist/ root
    res.type("application/javascript");
    res.send(bundle);
  });

  // get login page
  app.get("/login", async function(req: express.Request, res: express.Response) {
    const loginPage = await readFile("html/login.html");
    res.send(render(loginPage.toString(), getUsername(req)));
  });

  // process a login request
  app.post("/process-login", async function(req: express.Request, res: express.Response) {
    const { username, password } = req.body;
   
    try {
      const user = await User.loadByUsername(username);
      if (!user) {
        res.redirect("/login?error=1");
        return;
      }

      if (!(await user.validate(password))) {
        res.redirect("/login?error=1");
        return;
      }

      // add user to session table
      const id = sessionTable.addSession(user, false);
      res.cookie("sessionId", id, { maxAge: 8640000 * 8 });
      res.redirect("/");
    } catch (e) {
      console.error(e);
      res.redirect("/login?error=2");
    }
  });

  // get registration page
  app.get("/register", async function(req: express.Request, res: express.Response) {
    const registerPage = await readFile("html/register.html");
    res.send(render(registerPage.toString(), getUsername(req)));
  });

  // process a registration request
  app.post("/process-register", async function(req: express.Request, res: express.Response) {
    const { username, password, email } = req.body;

    // validate username/password
    try {
      let error = 0;
      if (username.trim().length === 0) error |= 1;

      if (password.trim().length === 0) error |= 2;
      else if (password.trim().length < 8) error |= 256;

      if (email.trim().length === 0) error |= 4;
      else if (!(emailRegex.test(email))) error |= 128;

      // tell if something is taken
      if (error === 0) {
        const taken = await Promise.all([
          checkUsernameUsage(username),
          checkEmailUsage(email)
        ]); 
 
        if (taken[0]) error |= 512;
        if (taken[1]) error |= 1024;
      }

      if (error !== 0) {
        res.redirect(`/register?errors=${error}`);
        return;
      }

      // create a new user
      const user = await User.createNewUser(username, password, email, false);
      const id = sessionTable.addSession(user, false);
      res.cookie("sessionId", id, { maxAge: 8640000 * 8 });
      res.redirect("/");
    } catch(e) {
      console.error(e);
      res.redirect("/register?errors=2048"); // internal error
      return;
    }
  });

  // get create student page
  app.get("/new-student", async function(req: express.Request, res: express.Response) {
    const newStudentPage = await readFile("html/createstudent.html");
    res.send(render(newStudentPage.toString(), getUsername(req)));
  });
 
  // process the creation of a new student
  app.post("/process-new-student", async function(req: express.Request, res: express.Response) {
    const { first, last, belt } = req.body;

    try {
      let error = 0;
      if (first.trim().length === 0) error |= 4;
      if (first.trim().length === 0) error |= 8;
      
      if (belt.trim().length === 0) error |= 16;
      else if (!parseBelt(belt)) { 
        error |= 2;
      }

      // check the session
      const username = getUsername(req);
      if (!username) {
        error |= 32;
      }

      // check for first/last combination
      if (error === 0) {
        if (await User.checkCombination(first, last)) error |= 1;
      }

      if (error) {
        let errUrl = `/new-student?errors=${error}`;
        if (error & 2) errUrl += `&belt=${belt}`;
        res.redirect(errUrl);
        return;
      } 

      // create a new student 
      let student = new Student(first, last, parseBelt(belt), 0);
      let user = await User.loadByUsername(username);

      await student.submit(); 
      user.students.push(student.studentId);
      await user.submit();
 
      res.redirect("/");
    } catch (e) {
      console.error(e);
      res.redirect("/new-student?errors=64");
      return;
    }
  });
 
  // main page
  app.get("/", async function(req: express.Request, res: express.Response) {
    const page = req.query.page || 0;
	  res.send(render(await getDiagram(page), getUsername(req)));
  });
 
  return app;
}
