/*
 * Gameplay statistics files offered as samples in Core Task 1.
 *
 * 1) unit_stats_18.5.csv — REAL public aggregate snapshot (avg placement, win/top-4 %, pick %)
 *    from metabot.gg "Highest Range TFT Champions" (Set 18, patch 18.5), retrieved 26 Oct 2026.
 * 2) comp_by_rank_18.5.csv — SIMULATED per-rank composition table written for the prototype
 *    (a designer would normally export this from internal telemetry).
 */
export const UNIT_STATS_CSV = `unit,cost,avg_place,top4_rate,pick_rate
Lux,5,3.4,70.06,8.62
Draven,5,4.0,56.30,11.33
Ashe,5,3.7,65.10,12.66
Gromp,2,4.3,54.04,5.43
Pebbles,1,4.3,53.90,14.05
Ezreal,4,4.2,54.24,16.83
Azir,3,4.5,50.76,14.98
Veigar,1,4.8,44.88,10.49
Yunara,2,4.8,43.51,5.70
Ahri,4,4.4,51.24,9.22
Caitlyn,2,5.0,40.13,5.62
Cassiopeia,3,5.0,40.70,7.17
Teemo,2,4.4,52.70,11.16
Tristana,3,4.5,49.51,11.98
Varus,1,4.6,49.24,12.31
Aphelios,4,4.2,57.12,14.20
Alune,5,3.5,69.54,11.17
Kayle,2,4.7,47.28,10.62
Kog'Maw,3,4.2,56.16,14.14
Zyra,4,4.3,53.32,7.10
Karma,1,4.6,48.57,10.53
Mama Beak,3,4.6,49.22,8.19
Xayah,1,4.8,45.08,13.42
Sivir,4,4.2,55.15,13.76
Soraka,4,4.2,56.78,10.65
Cinderling,1,4.3,53.88,9.36
Ivern,5,3.7,62.12,15.84
Morgana,4,4.5,50.79,12.06
Gnar,5,3.6,65.62,21.77
Kennen,5,3.8,62.40,19.03
Elder Dragon,5,3.8,62.34,8.99
Murkwolf,2,4.5,51.47,9.26
Scuttlecrab,2,4.5,50.04,12.12
Sentinel,4,4.2,56.44,30.04
Nidalee,4,4.2,56.62,12.08
Hecarim,3,4.6,48.62,15.43
Rek'Sai,1,4.8,45.85,11.47
Maokai,5,3.9,58.78,17.50
Malphite,4,4.5,50.27,11.77
Rakan,1,4.9,43.00,11.33
Lillia,4,4.3,52.91,12.19
Rammus,3,4.6,49.01,13.51
Akali,1,4.8,44.56,7.11
Amumu,4,4.1,56.07,27.63
Camille,1,5.2,38.24,6.52
Diana,3,4.4,51.81,18.54
Kha'Zix,3,4.5,50.80,5.59
Master Yi,3,4.7,46.81,7.23
Rengar,3,4.5,50.12,5.33
Vi,3,4.4,52.71,19.13
Taric,5,3.7,63.61,21.97
Warwick,2,5.1,38.52,3.87`;

export const COMP_BY_RANK_CSV = `comp,rank_band,games,avg_place,top4_rate,pick_rate
Riftbeast Elder Dragon,Iron–Gold,41200,3.95,58.1,9.8
Riftbeast Elder Dragon,Plat–Emerald,38800,3.88,59.4,11.2
Riftbeast Elder Dragon,Diamond,12100,3.71,62.0,13.6
Riftbeast Elder Dragon,Master+,4300,3.52,66.3,16.1
Riftbeast Brambleback,Iron–Gold,30100,4.02,57.2,7.4
Riftbeast Brambleback,Plat–Emerald,29400,4.01,58.0,8.9
Riftbeast Brambleback,Diamond,9800,3.90,59.7,10.4
Riftbeast Brambleback,Master+,3100,3.84,60.8,11.0
Executioner Azir,Iron–Gold,33900,3.98,58.6,8.7
Executioner Azir,Plat–Emerald,31200,4.05,57.9,8.1
Executioner Azir,Diamond,8700,4.31,52.5,7.0
Executioner Azir,Master+,2600,4.45,50.1,6.2
Juggernaut Amumu,Iron–Gold,20400,4.42,51.0,5.2
Juggernaut Amumu,Plat–Emerald,21100,4.30,52.7,6.0
Juggernaut Amumu,Diamond,6900,4.24,53.9,6.6
Juggernaut Amumu,Master+,2200,4.21,54.1,6.9
Lunar Aphelios,Iron–Gold,15800,4.61,47.9,4.1
Lunar Aphelios,Plat–Emerald,16900,4.48,49.8,4.6
Lunar Aphelios,Diamond,5200,4.40,51.2,4.8
Lunar Aphelios,Master+,1600,4.47,50.0,4.5
Blossom Ahri,Iron–Gold,18300,4.70,46.8,4.9
Blossom Ahri,Plat–Emerald,16200,4.66,47.0,4.4
Blossom Ahri,Diamond,4400,4.71,46.1,3.8
Blossom Ahri,Master+,1300,4.80,44.9,3.4
Sprykin Gnar,Iron–Gold,14100,4.36,52.0,3.9
Sprykin Gnar,Plat–Emerald,15800,4.22,53.6,4.5
Sprykin Gnar,Diamond,5800,4.18,54.2,5.3
Sprykin Gnar,Master+,1900,4.20,54.0,5.6
Spellweaver Alune,Iron–Gold,11700,4.75,45.2,3.1
Spellweaver Alune,Plat–Emerald,10900,4.83,44.0,2.9
Spellweaver Alune,Diamond,3100,4.90,42.8,2.5
Spellweaver Alune,Master+,900,4.95,42.0,2.4
Fae Lillia,Iron–Gold,9800,4.72,45.9,2.8
Fae Lillia,Plat–Emerald,10400,4.64,47.1,3.1
Fae Lillia,Diamond,3300,4.60,47.8,3.2
Fae Lillia,Master+,1000,4.66,47.0,3.0
Eclipse Flex,Iron–Gold,6100,4.95,42.5,1.8
Eclipse Flex,Plat–Emerald,6900,4.88,43.4,2.0
Eclipse Flex,Diamond,2300,4.79,44.6,2.1
Eclipse Flex,Master+,700,4.83,44.0,1.9`;
