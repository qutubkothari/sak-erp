import re

with open('/home/ubuntu/sak-erp/apps/web/src/app/dashboard/purchase/requisitions/page.tsx', 'r') as f:
    lines = f.readlines()

# Join lines 244 and 245 (0-indexed: 243 and 244)
if len(lines) > 244:
    # Line 244 should end with ) and line 245 starts with ;
    if lines[243].strip().endswith(')') and lines[244].strip() == ';':
        # Remove the ) from line 244 and the ; from line 245
        lines[243] = lines[243].rstrip() + ';\n'
        del lines[244]
        
with open('/home/ubuntu/sak-erp/apps/web/src/app/dashboard/purchase/requisitions/page.tsx', 'w') as f:
    f.writelines(lines)

print('Fixed!')
