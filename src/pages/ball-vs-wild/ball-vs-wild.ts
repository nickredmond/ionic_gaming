import { Component } from "@angular/core";
import { Storage } from "@ionic/storage";
import { Unit, Enemy } from "../../models/unit";
import { Color } from "../../models/color";
import { Shape, Circle } from "../../models/shapes";
import { HealthBar, PowerupBar } from "../../models/statusbars";
import { EnemyProducer } from "../../models/enemy.producer";
import { ExtendedMath } from  "../../models/extendedmath";

@Component({
  selector: 'ball-vs-wild',
  templateUrl: 'ball-vs-wild.html'
})
export class BallVsWildPage {
  static readonly FPS: number = 60;
  static readonly MILLIS_PER_SECOND: number = 1000;
  static readonly MIN_SHOT_VELOCITY: number = 400;
  static readonly PROJECTILE_COLOR: Color = Color.fromHexValue("#FF0000");
  static readonly RADIANS_PER_PROJECTILE: number = ExtendedMath.toRadians(45);

  maxVelocityX: number = 0;
  maxVelocityY: number = 0;
  maxVelocity: number = 0;

  heroTopLeftX: number;
  heroTopLeftY: number;
  score: number = 0;
  highScore: number = 0;
  hero: Unit = null;
  healthBar: HealthBar = null;
  powerupBar: PowerupBar = null;
  projectiles: Unit[] = [];
  enemies: Enemy[] = [];
  enemyGenerators: EnemyProducer[] = [];

  canvasContext: CanvasRenderingContext2D = null;
  projectileShape: Shape = null;
  storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
    this.storage.get("highScore").then((val) => {
      if (val === null){
        this.storage.set("highScore", 0);
      }
      else {
        this.highScore = val;
      }
    });

    this.healthBar = new HealthBar(15, 15);
    let dtMillis = BallVsWildPage.MILLIS_PER_SECOND / BallVsWildPage.FPS;

    setInterval((
      function(self, dtMilliseconds){
        return function() {
          if (self.canvasContext){
            let ctx = self.canvasContext;
            if (ctx.fillStyle != "white") {
              ctx.fillStyle = "white";
            }
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            if (self.healthBar.healthPoints > 0){
              self.gameTick(dtMilliseconds);
            }
            else {
              let centerX = ctx.canvas.width / 2;
              let centerY = ctx.canvas.height / 2;

              if (ctx.font != "30px Courier" || ctx.textAlign != "center") {
                ctx.font = "30px Courier";
                ctx.textAlign = "center";
              }
              ctx.fillText("You have died.", centerX, centerY - 20);
              ctx.fillText("SCORE: " + self.score, centerX, centerY + 15);

              ctx.font = "18px Courier";
              ctx.fillText("(Tap to retry)", centerX, centerY + 50);
            }
          }
        };
      })(this, dtMillis), dtMillis);
  }

  updateHighScore(){
    if (this.score > this.highScore){
      this.storage.set("highScore", this.score);
      this.highScore = this.score;
    }
  }

  gameTick(dtMilliseconds: number){
    for (var i = 0; i < this.enemyGenerators.length; i++){
      let enemy = this.enemyGenerators[i].tick(dtMilliseconds);
      if (enemy != null){
        this.enemies.push(enemy);
      }
    }

    this.projectiles = this.projectiles.filter(function(proj){
      return proj.isAlive;
    });
    for (var i = 0; i < this.projectiles.length; i++){
      let projectile = this.projectiles[i];
      if (projectile.positionX < -projectile.size || projectile.positionX > (this.canvasContext.canvas.width + projectile.size) ||
            projectile.positionY < -projectile.size || projectile.positionY > (this.canvasContext.canvas.height + projectile.size)){
        projectile.isAlive = false;
      }
      else {
        projectile.update(dtMilliseconds / BallVsWildPage.MILLIS_PER_SECOND);
        projectile.draw(this.canvasContext);
      }
    }

    this.enemies = this.enemies.filter(function(enemy){
      return enemy.isAlive;
    });
    for (var i = 0; i < this.enemies.length; i++){
      let enemy = this.enemies[i];
      if (this.hero.intersects(enemy)){
        if (this.healthBar.healthPoints === 1){
          this.updateHighScore();
        }
        this.healthBar.takeHealth();
        enemy.isAlive = false;
      }
      else {
        enemy.update(dtMilliseconds / BallVsWildPage.MILLIS_PER_SECOND);
        enemy.draw(this.canvasContext);
      }
    }

    for (var j = 0; j < this.enemies.length; j++){
      for (var k = 0; k < this.projectiles.length; k++){
        if (this.enemies[j].intersects(this.projectiles[k])){
          this.strikeEnemy(this.enemies[j], this.projectiles[k]);
        } else {
          let offsetX = this.enemies[j].positionX;
          let offsetY = this.enemies[j].positionY;
          let x1 = this.projectiles[k].positionX + offsetX;
          let y1 = this.projectiles[k].positionY + offsetY;

          this.projectiles[k].update(dtMilliseconds / BallVsWildPage.MILLIS_PER_SECOND);
          let x2 = this.projectiles[k].positionX + offsetX;
          let y2 = this.projectiles[k].positionY + offsetY;

          let dx_squared = Math.pow(x2 - x1, 2);
          let dy_squared = Math.pow(y2 - y1, 2);
          let dr = Math.sqrt(dx_squared + dy_squared);
          let D = (x1 * y2) - (x2 * y1);
          let discriminant = (Math.pow(this.enemies[j].size, 2) * Math.pow(dr, 2)) - Math.pow(D, 2);
          let isIntersection = (discriminant >= 0);

          if (isIntersection) {
            this.strikeEnemy(this.enemies[j], this.projectiles[k]);
          } else {
            this.projectiles[k].reverseFrame(dtMilliseconds / BallVsWildPage.MILLIS_PER_SECOND);
          }
        }
      }
    }
    this.powerupBar.update(dtMilliseconds);
    this.powerupBar.draw(this.canvasContext);

    if (this.hero){
      this.hero.draw(this.canvasContext);
    }
    this.healthBar.draw(this.canvasContext);

    let ctx = this.canvasContext;
    let scoreX = ctx.canvas.width - 15;

    if (ctx.font != "18px Courier") {
      ctx.font = "18px Courier";
    }
    ctx.fillStyle = "#AAA";
    ctx.textAlign = "right";
    ctx.fillText("HI SCORE: " + this.highScore, scoreX, 30);

    ctx.font = "30px Courier";
    ctx.fillStyle = "white";
    ctx.fillText(this.score.toString(), scoreX, 60);
  }

  private strikeEnemy(enemy: Enemy, projectile: Unit) {
    this.score += enemy.value;
    this.powerupBar.addPoints(enemy.value);
    enemy.isAlive = false;
    projectile.isAlive = false;
  }

  onDragGesture(event){
    let xVelSquared = event.velocityX * event.velocityX;
    let yVelSquared = event.velocityY * event.velocityY;
    let currentVelocity = Math.sqrt(xVelSquared + yVelSquared);

    if (currentVelocity > this.maxVelocity){
      this.maxVelocity = currentVelocity;
      this.maxVelocityX = event.velocityX;
      this.maxVelocityY = event.velocityY;
    }
  }
  onTouchEnd(event) {
    if (this.healthBar.healthPoints === 0){
      this.healthBar.healthPoints = HealthBar.DEFAULT_MAX_HP;
      this.powerupBar.clearBar();
      this.projectiles = [];
      this.enemies = [];
      this.score = 0;
    }
    else if (this.maxVelocity > 0) {
      let velocityScale = BallVsWildPage.MIN_SHOT_VELOCITY / Math.abs(this.maxVelocity);

      let nextProjectile = new Unit(this.projectileShape, this.heroTopLeftX, this.heroTopLeftY,
        5, BallVsWildPage.PROJECTILE_COLOR);
      nextProjectile.velocityX = (velocityScale > 1) ? (this.maxVelocityX * velocityScale) : this.maxVelocityX;
      nextProjectile.velocityY = (velocityScale > 1) ? (this.maxVelocityY * velocityScale) : this.maxVelocityY;
      this.projectiles.push(nextProjectile);

      this.maxVelocity = 0;
    }
  }
  onDoubleTap(event) {
    if (this.powerupBar.isPowerupEnabled()) {
      this.powerupBar.expend();

      let startingDegrees = Math.random() * 360;
      let startingRadians = ExtendedMath.toRadians(startingDegrees);
      for (var i = 0; i < 8; i++) {
        let radians = startingRadians + (BallVsWildPage.RADIANS_PER_PROJECTILE * i);
        let xVelocityRatio = Math.cos(radians);
        let yVelocityRatio = Math.sin(radians);
        let nextProjectile = new Unit(this.projectileShape, this.heroTopLeftX, this.heroTopLeftY,
          5, BallVsWildPage.PROJECTILE_COLOR);
        nextProjectile.velocityX = xVelocityRatio * BallVsWildPage.MIN_SHOT_VELOCITY;
        nextProjectile.velocityY = yVelocityRatio * BallVsWildPage.MIN_SHOT_VELOCITY;

        this.projectiles.push(nextProjectile);
      }
    }
  }

  ionViewDidEnter() {
  	let canvas = <HTMLCanvasElement>document.getElementById("mainCanvas");
    this.canvasContext = canvas.getContext("2d");
    this.projectileShape = new Circle(this.canvasContext);

    this.canvasContext.canvas.width = window.innerWidth;
    this.canvasContext.canvas.height = window.innerHeight;
    this.canvasContext.canvas.style.backgroundColor = "#000";

    let powerupWidth = 0.8 * window.innerWidth;
    let powerupHeight = 15;
    let margin = 0.1 * window.innerWidth;
    let yPosition = window.innerHeight - powerupHeight - 15;
    this.powerupBar = new PowerupBar(powerupWidth, powerupHeight, 150, margin, yPosition, "DOUBLE-TAP");

    let size = 25;
    this.heroTopLeftX = (this.canvasContext.canvas.width / 2) - (size / 2);
    this.heroTopLeftY = (this.canvasContext.canvas.height / 2) - (size / 2);
    let heroColor = Color.fromHexValue("#0200FF");
    let heroShape = new Circle(this.canvasContext);
    this.hero = new Unit(heroShape, this.heroTopLeftX, this.heroTopLeftY, size, heroColor);

    this.enemyGenerators.push(new EnemyProducer(10, 20, 100, 5000, this.hero, Color.fromHexValue("#FFF000"), this.canvasContext));
    this.enemyGenerators.push(new EnemyProducer(25, 10, 175, 8000, this.hero, Color.fromHexValue("#00FF00"), this.canvasContext));
  }
}

// //
// //
/////
// TODO: improved collision ***
// TODO: only change ctx props if necessary ***
//       i.e. ctx.color = 'white' if not white, already
// TODO: health-plus and extrahealth-plus items
