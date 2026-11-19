import { DispatchRate } from '@app/models/DispatchRate'
import { Prospect } from '@app/models/Prospect'
import { Territory } from '@app/models/Territory'
import { MockSeeder } from '../MockSeeder'

/** Scouts' territories and the boards they're chasing, and the prices dispatchers saved. */
export class MockScoutingSeeder extends MockSeeder {
  async run(): Promise<void> {
    await this.territories()
    await this.prospects()
    await this.dispatchRates()
  }

  private async territories(): Promise<void> {
    const areas: [string, string, number, number, number][] = [
      ['Kaduna North', 'usman', 10.565, 7.44, 9000],
      ['Kaduna South', 'halima', 10.465, 7.44, 9000],
      ['Nairobi West', 'brian', -1.295, 36.79, 7000],
      ['Zaria', '', 11.085, 7.71, 12000],
    ]

    await this.data.insert(
      Territory,
      areas.map(([name, scout, latitude, longitude, radiusM]) => ({
        id: this.data.id(),
        name,
        scoutId: this.data.find('users', scout)?.id ?? null,
        latitude,
        longitude,
        radiusM,
        ...this.data.stamps(-120),
      })),
    )
  }

  private async prospects(): Promise<void> {
    const leads: { scout: string; name: string; at: [number, number]; address: string; owner?: [string, string]; notes: string; stage: string; board?: string; daysAgo: number }[] = [
      { scout: 'usman', name: 'Refinery Road unipole', at: [10.437, 7.475], address: 'Refinery Road, by the NNPC gate', owner: ['Malam Sani Aliyu', '+2348005550201'], notes: 'Owner wants to see a signed board first. Show him Kawo.', stage: 'contacted', daysAgo: 6 },
      { scout: 'usman', name: 'Command junction wall', at: [10.6, 7.45], address: 'Kawo, Command junction', notes: 'Big wall, no owner details yet. Ask the shop next door.', stage: 'prospect', daysAgo: 2 },
      { scout: 'usman', name: 'Rigasa expressway pole', at: [10.54, 7.38], address: 'Nnamdi Azikiwe Expressway, Rigasa', owner: ['Hajiya Zainab Lawal', '+2348005550102'], notes: 'Agreement sent, she’s reading it with her son.', stage: 'signed', board: 'rigasa', daysAgo: 4 },
      { scout: 'usman', name: 'Kawo junction double', at: [10.58, 7.443], address: 'Ahmadu Bello Way, Kawo', owner: ['Alhaji Musa Bello', '+2348005550101'], notes: 'Earning since September.', stage: 'captured', board: 'kawo', daysAgo: 140 },
      { scout: 'halima', name: 'Malali junction board', at: [10.555, 7.45], address: 'Rabah Road, Malali', owner: ['Hajiya Zainab Lawal', '+2348005550102'], notes: 'Tagged, waiting for staff to check it.', stage: 'captured', board: 'malali', daysAgo: 3 },
      { scout: 'halima', name: 'Television garage', at: [10.49, 7.42], address: 'Television garage, Kakuri', notes: 'Owner said no for now. Try again after the rains.', stage: 'lost', daysAgo: 30 },
      { scout: 'brian', name: 'Waiyaki Way gantry', at: [-1.264, 36.803], address: 'Waiyaki Way, Westlands', owner: ['Grace Njeri', '+254700555202'], notes: 'Meeting her on Thursday.', stage: 'contacted', daysAgo: 5 },
    ]

    await this.data.insert(
      Prospect,
      leads.map((lead) => ({
        id: this.data.id(),
        scoutId: this.data.get('users', lead.scout).id,
        name: lead.name,
        latitude: lead.at[0],
        longitude: lead.at[1],
        address: lead.address,
        ownerName: lead.owner?.[0] ?? null,
        ownerPhone: lead.owner?.[1] ?? null,
        notes: lead.notes,
        stage: lead.stage,
        boardId: this.data.find('boards', lead.board)?.id ?? null,
        stageChangedAt: this.data.at(-lead.daysAgo),
        ...this.data.stamps(-lead.daysAgo),
      })),
    )
  }

  private async dispatchRates(): Promise<void> {
    const rates: [string, number, number, number, number, number, string][] = [
      ['yakubu', 2_500, 40_000, 10.52, 7.44, 40, 'Flex and vinyl. Free re-hang within a week if the wind takes it.'],
      ['esther', 2_800, 50_000, 9.06, 7.49, 600, 'Based in Abuja, travel to Kaduna and Lagos.'],
      ['kofi', 22, 400, 5.6, -0.19, 30, 'Greater Accra only.'],
    ]

    await this.data.insert(
      DispatchRate,
      rates.map(([user, perSqm, minFee, latitude, longitude, radiusKm, note]) => ({
        id: this.data.id(),
        userId: this.data.get('users', user).id,
        pricePerSqmMinor: perSqm * 100,
        minFeeMinor: minFee * 100,
        latitude,
        longitude,
        radiusKm,
        note,
        ...this.data.stamps(-90),
      })),
    )
  }
}
