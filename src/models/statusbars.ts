export class HealthBar {
	static readonly DEFAULT_HP_SIZE: number = 25;
	static readonly DEFAULT_MAX_HP: number = 3;
	static readonly HP_PADDING: number = 5;
	static readonly HP_IMG_SRC: string = "img/health-point-heart.ico";

	positionX: number;
	positionY: number;
	healthPointSize: number;
	maxHealthPoints: number;
	healthPoints: number;
	hpImage: HTMLImageElement;

	constructor(positionX: number, positionY: number,
			maxHP: number = HealthBar.DEFAULT_MAX_HP,
			hpSize: number = HealthBar.DEFAULT_HP_SIZE){
		this.positionX = positionX;
		this.positionY = positionY;
		this.healthPointSize = hpSize;
		this.maxHealthPoints = maxHP;
		this.healthPoints = maxHP;

		this.hpImage = new Image();
		this.hpImage.src = HealthBar.HP_IMG_SRC;
	}

	giveHealth(){
		if (this.healthPoints < this.maxHealthPoints){
			this.healthPoints += 1;
		}
	}
	takeHealth(){
		if (this.healthPoints > 0){
			this.healthPoints -= 1;
		}
	}

	draw(ctx: CanvasRenderingContext2D){
		let imgX = this.positionX;
		for (var i = 0; i < this.healthPoints; i++){
			ctx.drawImage(this.hpImage, imgX, this.positionY, this.healthPointSize, this.healthPointSize);
			imgX += this.healthPointSize + HealthBar.HP_PADDING;
		}
	}
}

export class PowerupBar {
	static readonly DEFAULT_BLINK_RATE: number = 500;

	height: number;
	width: number;
	positionX: number;
	positionY: number;
	maxPoints: number;
	currentPoints: number = 0;
	barFilledPhrase: string;
	blinkRateMillis: number;
	isTextShowing: boolean = false;
	millisSinceBlink: number = 0;

	constructor(width: number, height: number, maxPoints: number, 
			x: number = 0, y: number = 0, barFilledPhrase: string = "READY",
			blinkRateMillis = PowerupBar.DEFAULT_BLINK_RATE) {
		this.height = height;
		this.width = width;
		this.maxPoints = maxPoints;
		this.barFilledPhrase = barFilledPhrase;
		this.blinkRateMillis = blinkRateMillis;
		this.positionX = x;
		this.positionY = y;
	}

	addPoints(points: number) {
		if (this.currentPoints < this.maxPoints) {
			let pointsToAdd = Math.min(this.pointsLeft(), points);
			this.currentPoints += pointsToAdd;
			if (this.currentPoints >= this.maxPoints){
				this.isTextShowing = true;
			}
		}
	}

	isPowerupEnabled(): boolean {
		return this.currentPoints >= this.maxPoints;
	}

	expend() {
		if (this.isPowerupEnabled()) {
			this.clearBar();
		} else {
			throw new Error("Cannot expend powerup: " + this.pointsLeft() + " pts needed!");
		}
	}
	clearBar() {
		this.currentPoints = 0;
		this.millisSinceBlink = 0;
		this.isTextShowing = false;
	}

	update(dtMilliseconds: number) {
		if (this.isPowerupEnabled()) {
			this.millisSinceBlink += dtMilliseconds;
			if (this.millisSinceBlink >= this.blinkRateMillis) {
				this.isTextShowing = !this.isTextShowing;
				this.millisSinceBlink = 0;
			}
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		if (this.currentPoints > 0) {
			let percentFilled = this.currentPoints / this.maxPoints;
			let fillWidth = Math.floor(percentFilled * this.width);
			ctx.fillStyle = "white";
			ctx.fillRect(this.positionX, this.positionY, fillWidth, this.height);

			if (this.isTextShowing) {
				if (ctx.font != "18px Courier") {
					ctx.font = "18px Courier";
				}
				if (ctx.textAlign != "center") {
					ctx.textAlign = "center";
				}
				let centerX = ctx.canvas.width / 2;
				ctx.fillText(this.barFilledPhrase, centerX, this.positionY - 10);
			}
		}
	}

	private pointsLeft(): number {
		return this.maxPoints - this.currentPoints;
	}
}