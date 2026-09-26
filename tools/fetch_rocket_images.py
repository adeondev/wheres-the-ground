import os
import urllib.request
import io
import json
from PIL import Image

out_dir = os.path.join('assets', 'sprites', 'intro', 'rockets')
os.makedirs(out_dir, exist_ok=True)

rockets = [
    {
        'id': 'saturn_v',
        'url': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/Apollo_11_Launch_-_GPN-2000-000630.jpg/500px-Apollo_11_Launch_-_GPN-2000-000630.jpg',
        'crop_bias': 0.35
    },
    {
        'id': 'space_shuttle',
        'url': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d6/STS120LaunchHiRes-edit1.jpg/500px-STS120LaunchHiRes-edit1.jpg',
        'crop_bias': 0.40
    },
    {
        'id': 'vostok_1',
        'url': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Semyorka_Rocket_R7_by_Sergei_Korolyov_in_VDNH_Ostankino_RAF0540.jpg/500px-Semyorka_Rocket_R7_by_Sergei_Korolyov_in_VDNH_Ostankino_RAF0540.jpg',
        'crop_bias': 0.25
    },
    {
        'id': 'falcon_9',
        'url': 'https://images-assets.nasa.gov/image/KSC-20190302-PH_KLS01_0022/KSC-20190302-PH_KLS01_0022~medium.jpg',
        'crop_bias': 0.35
    },
    {
        'id': 'soyuz',
        'url': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d0/Expedition_75_Launch_%28NHQ202607140006%29.jpg/500px-Expedition_75_Launch_%28NHQ202607140006%29.jpg',
        'crop_bias': 0.30
    },
    {
        'id': 'mercury_atlas',
        'url': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/36/Launch_of_Friendship_7_-_GPN-2000-000686.jpg/500px-Launch_of_Friendship_7_-_GPN-2000-000686.jpg',
        'crop_bias': 0.30
    },
    {
        'id': 'titan_ii',
        'url': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/Gemini-Titan_11_Launch_-_GPN-2000-001020.jpg/500px-Gemini-Titan_11_Launch_-_GPN-2000-001020.jpg',
        'crop_bias': 0.30
    },
    {
        'id': 'sls_artemis',
        'url': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/Artemis_II_launch_%28SLS_MAF_20260401_ArtemisIILaunch_02%29_crop.jpg/500px-Artemis_II_launch_%28SLS_MAF_20260401_ArtemisIILaunch_02%29_crop.jpg',
        'crop_bias': 0.35
    },
    {
        'id': 'ariane_5',
        'url': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4f/Ariane_5_with_James_Webb_Space_Telescope_Prelaunch_%2851773093465%29.jpg/500px-Ariane_5_with_James_Webb_Space_Telescope_Prelaunch_%2851773093465%29.jpg',
        'crop_bias': 0.35
    },
    {
        'id': 'atlas_v',
        'url': 'https://images-assets.nasa.gov/image/KSC-20160908-PH_SRJ05_0020/KSC-20160908-PH_SRJ05_0020~medium.jpg',
        'crop_bias': 0.35
    }
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

TARGET_W = 180
TARGET_H = 110

for r in rockets:
    out_path = os.path.join(out_dir, r['id'] + '.jpg')
    print('Fetching', r['id'], '...')
    try:
        req = urllib.request.Request(r['url'], headers=headers)
        data = urllib.request.urlopen(req, timeout=12).read()
        im = Image.open(io.BytesIO(data)).convert('RGB')
        
        target_ratio = TARGET_W / TARGET_H
        img_ratio = im.width / im.height
        
        if img_ratio > target_ratio:
            new_w = int(im.height * target_ratio)
            left = (im.width - new_w) // 2
            im = im.crop((left, 0, left + new_w, im.height))
        else:
            new_h = int(im.width / target_ratio)
            bias = r.get('crop_bias', 0.35)
            top = max(0, min(int((im.height - new_h) * bias), im.height - new_h))
            im = im.crop((0, top, im.width, top + new_h))
            
        im = im.resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
        im.save(out_path, quality=90)
        print('Saved:', out_path, im.size)
    except Exception as e:
        print('Error fetching', r['id'], ':', e)
