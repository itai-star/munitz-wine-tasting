#!/bin/bash
# Run from marketing/harvest-2026-summary/video. Expects clips/clip0.mp4 (kept) and clips/v2_clip1..3.mp4 (regenerated).
set -e
FADE='format=rgba,fade=t=in:st=0.5:d=0.6:alpha=1,fade=t=out:st=4.1:d=0.4:alpha=1'
ffmpeg -v error -y \
 -i clips/clip0.mp4 -i clips/v2_clip1.mp4 -i clips/v3_clip2b.mp4 -i clips/v2_clip3.mp4 \
 -loop 1 -framerate 30 -t 5 -i ov0-cover.png \
 -loop 1 -framerate 30 -t 5 -i ov1-tons.png \
 -loop 1 -framerate 30 -t 5 -i ov2-deliveries.png \
 -loop 1 -framerate 30 -t 9.5 -i ov3-static.png \
 -loop 1 -framerate 30 -t 9.5 -i ov3g0.png \
 -loop 1 -framerate 30 -t 9.5 -i ov3g1.png \
 -loop 1 -framerate 30 -t 9.5 -i ov3g2.png \
 -loop 1 -framerate 30 -t 9.5 -i ov3g3.png \
 -loop 1 -framerate 30 -t 3 -i end-card.png \
 -filter_complex "
[0:v]trim=0:5,setpts=PTS-STARTPTS,fps=30[c0];[1:v]trim=0:5,setpts=PTS-STARTPTS,fps=30[c1];[2:v]trim=0:5,setpts=PTS-STARTPTS,fps=30[c2];[3:v]trim=0:9.5,setpts=PTS-STARTPTS,fps=30[c3];
[4:v]${FADE}[o0];[5:v]${FADE}[o1];[6:v]${FADE}[o2];
[7:v]format=rgba,fade=t=in:st=0.5:d=0.6:alpha=1,fade=t=out:st=8.9:d=0.5:alpha=1[st];
[8:v]format=rgba,fade=t=in:st=0.6:d=0.3:alpha=1,fade=t=out:st=2.6:d=0.3:alpha=1[g0];
[9:v]format=rgba,fade=t=in:st=2.6:d=0.3:alpha=1,fade=t=out:st=4.6:d=0.3:alpha=1[g1];
[10:v]format=rgba,fade=t=in:st=4.6:d=0.3:alpha=1,fade=t=out:st=6.6:d=0.3:alpha=1[g2];
[11:v]format=rgba,fade=t=in:st=6.6:d=0.3:alpha=1,fade=t=out:st=8.9:d=0.5:alpha=1[g3];
[c0][o0]overlay=0:0:format=auto,format=yuv420p[s0];[c1][o1]overlay=0:0:format=auto,format=yuv420p[s1];[c2][o2]overlay=0:0:format=auto,format=yuv420p[s2];
[c3][st]overlay=0:0:format=auto[t1];[t1][g0]overlay=0:0:format=auto[t2];[t2][g1]overlay=0:0:format=auto[t3];[t3][g2]overlay=0:0:format=auto[t4];[t4][g3]overlay=0:0:format=auto,format=yuv420p[s3];
[12:v]fps=30,format=yuv420p[e];
[s0][s1]xfade=transition=fade:duration=0.5:offset=4.5[x1];[x1][s2]xfade=transition=fade:duration=0.5:offset=9.0[x2];[x2][s3]xfade=transition=fade:duration=0.5:offset=13.5[x3];[x3][e]xfade=transition=fade:duration=0.5:offset=22.5[v];
[0:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:5,asetpts=PTS-STARTPTS[a0];[1:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:5,asetpts=PTS-STARTPTS[a1];[2:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:5,asetpts=PTS-STARTPTS[a2];[3:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:9.5,asetpts=PTS-STARTPTS[a3];
anullsrc=r=48000:cl=stereo,atrim=0:3,asetpts=PTS-STARTPTS[ae];
[a0][a1]acrossfade=d=0.5[ax1];[ax1][a2]acrossfade=d=0.5[ax2];[ax2][a3]acrossfade=d=0.5[ax3];[ax3][ae]acrossfade=d=0.5[ax4];
[ax4]afade=t=out:st=24:d=1.5,loudnorm=I=-16:TP=-1.5,aresample=48000[a]" \
 -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -movflags +faststart harvest-2026-atmosphere-v3.mp4
ffprobe -v error -show_entries format=duration -of default=nw=1 harvest-2026-atmosphere-v3.mp4
