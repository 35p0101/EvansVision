-- Drop the old foreign key constraint linking predictions to matches
ALTER TABLE "predictions" DROP CONSTRAINT "predictions_match_id_fkey";

-- Add home_team_id and away_team_id columns
ALTER TABLE "predictions" ADD COLUMN "home_team_id" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE "predictions" ADD COLUMN "away_team_id" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- Remove the temporary defaults
ALTER TABLE "predictions" ALTER COLUMN "home_team_id" DROP DEFAULT;
ALTER TABLE "predictions" ALTER COLUMN "away_team_id" DROP DEFAULT;

-- Add foreign key constraints to teams table
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
