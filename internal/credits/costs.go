package credits


// ---- Clip cost ----

// clipCostPerMin holds the credit cost per minute for each quality
var clipCostPerMin = map[int]float64{
	480:  0.25,
	720:  0.5,
	1080: 1.0,
	1440: 2.0,
}

// CalculateClipCreditCost calculates the credit cost for a clip based on the duration and quality
func CalculateClipCreditCost(durationInSeconds int, quality int) float64 {
	return clipCostPerMin[quality] * (float64(durationInSeconds) / 60.0)
}


// ---- GIF cost ----

// gifWidthCostPerTenSec holds the credit cost per 10 seconds for each width
var gifWidthCostPerTenSec = map[int]float64{
	320:  .5,
	480:  1,
	720:  1.5,
}

// gifFPSCostMultipliers holds the credit cost multiplier for each FPS (frames per second)
var gifFPSCostMultipliers = map[int]float64{
	10: 0.75,
	15: 1.0,
	20: 1.5,
}

// gifSpeedCostMultipliers holds the credit cost multiplier for each speed
var gifSpeedCostMultipliers = map[float64]float64{
	0.5: 2.0,
	1.0: 1.0,
	1.5: 0.75,
	2.0: 0.5,
}

// CalculateGIFCreditCost calculates the credit cost for a GIF 
func CalculateGIFCreditCost(durationInSeconds int, width int, fps int, speed float64) float64 {
	return gifWidthCostPerTenSec[width] * (float64(durationInSeconds) / 10.0) * gifFPSCostMultipliers[fps] * gifSpeedCostMultipliers[speed]
}
